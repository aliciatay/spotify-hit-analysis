// Set the dimensions and margins of the visualization
const margin = {top: 30, right: 100, bottom: 30, left: 50};
const width = 1200 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create the SVG container
const svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create color scale for popularity (red to green)
const colorScale = d3.scaleSequential()
    .domain([0, 100])
    .interpolator(t => d3.interpolateRgb("#ff4444", "#44ff44")(t));

// Load the data
d3.json("processed_data.json").then(function(response) {
    const data = response.songs;
    const featureRanges = response.feature_ranges;
    
    // Extract feature names
    let features = Object.keys(data[0].features);
    
    // Create scales for each feature
    const scales = {};
    features.forEach(feature => {
        scales[feature] = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);
    });

    // Create position scale for axes
    let xScale = d3.scalePoint()
        .domain(features)
        .range([0, width]);

    // Function to render the parallel coordinates
    function render(features) {
        // Update position scale
        xScale.domain(features);

        // Create the parallel coordinates line generator
        const line = d3.line()
            .defined(([, value]) => value != null)
            .x(([key]) => xScale(key))
            .y(([, value]) => scales[key](value));

        // Update axes
        const axes = svg.selectAll(".axis")
            .data(features, d => d);

        // Remove old axes
        axes.exit().remove();

        // Add new axes
        const axesEnter = axes.enter()
            .append("g")
            .attr("class", "axis")
            .call(drag);

        // Update all axes
        axes.merge(axesEnter)
            .attr("transform", d => `translate(${xScale(d)},0)`)
            .each(function(d) {
                d3.select(this).call(d3.axisLeft(scales[d]));
            });

        // Add axes labels
        axesEnter.append("text")
            .attr("y", -9)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .text(d => `${d}\n[${featureRanges[d].min.toFixed(2)}-${featureRanges[d].max.toFixed(2)}]`);

        // Update lines
        const paths = svg.selectAll(".line")
            .data(data);

        // Add new lines
        const pathsEnter = paths.enter()
            .append("path")
            .attr("class", "line")
            .style("stroke", d => colorScale(d.popularity))
            .style("opacity", 0.3);

        // Update all lines
        paths.merge(pathsEnter)
            .attr("d", d => line(features.map(key => [key, d.features[key]])));

        // Add brushes
        const brushes = {};
        features.forEach(feature => {
            const brush = d3.brushY()
                .extent([[xScale(feature) - 10, 0], [xScale(feature) + 10, height]])
                .on("start brush end", brushed);

            const axisGroup = svg.select(`.axis:nth-child(${features.indexOf(feature) + 1})`);
            axisGroup.call(brush);
            brushes[feature] = brush;
        });

        // Add tooltips
        paths.merge(pathsEnter)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .style("stroke-width", 2)
                    .style("opacity", 1)
                    .raise();

                const tooltip = d3.select("body")
                    .append("div")
                    .attr("class", "tooltip");

                tooltip.html(`
                    <strong>${d.track_name}</strong><br>
                    Artist: ${d.artists}<br>
                    Popularity: ${d.popularity}<br>
                    Hit Count: ${d.hit_count}<br>
                    ${Object.entries(d.features)
                        .map(([key, value]) => `${key}: ${value.toFixed(3)}`)
                        .join("<br>")}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .style("stroke-width", 1)
                    .style("opacity", 0.3);
                d3.selectAll(".tooltip").remove();
            });

        // Brushing function
        function brushed(event) {
            if (event.selection === null) return;
            const feature = features[d3.select(this).datum()];
            const [y0, y1] = event.selection;

            svg.selectAll(".line")
                .style("opacity", d => {
                    const value = scales[feature](d.features[feature]);
                    return value >= y0 && value <= y1 ? 0.7 : 0.1;
                });
        }
    }

    // Drag behavior for axes
    const drag = d3.drag()
        .subject(function() {
            const t = d3.select(this);
            return {
                x: t.attr("transform").match(/translate\(([^,]+)/)[1]
            };
        })
        .on("start", function(event) {
            d3.select(this).raise().classed("active", true);
        })
        .on("drag", function(event, d) {
            // Get the current position
            const xPos = event.x;
            
            // Find the closest position in the domain
            const domain = features.slice();
            const range = domain.map(key => xScale(key));
            const i = d3.bisectLeft(range, xPos);
            
            if (i > 0 && i < domain.length) {
                // Swap the positions
                const oldIndex = domain.indexOf(d);
                const newIndex = i > oldIndex ? i - 1 : i;
                domain.splice(oldIndex, 1);
                domain.splice(newIndex, 0, d);
                features = domain;
                render(features);
            }
        })
        .on("end", function() {
            d3.select(this).classed("active", false);
        });

    // Initial render
    render(features);

    // Add color legend
    const legendWidth = 20;
    const legendHeight = height / 2;
    
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "popularity-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(0));
    
    gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", colorScale(50));
    
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(100));

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + margin.right/2}, ${height/4})`);

    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#popularity-gradient)");

    const legendScale = d3.scaleLinear()
        .domain([0, 100])
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5);

    legend.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(legendAxis);

    legend.append("text")
        .attr("transform", `translate(${legendWidth + 30}, ${-10})`)
        .style("text-anchor", "middle")
        .text("Popularity");
}); 