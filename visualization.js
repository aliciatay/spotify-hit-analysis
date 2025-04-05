// Set the dimensions and margins of the visualization
const margin = {top: 30, right: 100, bottom: 30, left: 50};
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

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
    const y = {};
    features.forEach(feature => {
        y[feature] = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);
    });

    // Create position scale for axes
    const x = d3.scalePoint()
        .range([0, width])
        .padding(1)
        .domain(features);

    function path(d) {
        return d3.line()(features.map(feature => [x(feature), y[feature](d.features[feature])]));
    }

    // Add the lines
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.4)
      .selectAll("path")
      .data(data)
      .join("path")
        .attr("stroke", d => colorScale(d.popularity))
        .attr("d", path)
        .attr("class", "line");

    // Add a group element for each dimension.
    const g = svg.selectAll(".dimension")
        .data(features)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${x(d)})`)
        .call(d3.drag()
            .on("start", function(event) {
                d3.select(this).raise().classed("active", true);
            })
            .on("drag", function(event, d) {
                const xPos = event.x;
                const domain = features.slice();
                const i = d3.bisectLeft(domain.map(key => x(key)), xPos);
                if (i > 0 && i < domain.length) {
                    const oldIndex = domain.indexOf(d);
                    const newIndex = i > oldIndex ? i - 1 : i;
                    domain.splice(oldIndex, 1);
                    domain.splice(newIndex, 0, d);
                    x.domain(domain);
                    g.attr("transform", d => `translate(${x(d)})`);
                    svg.selectAll(".line").attr("d", path);
                }
            })
            .on("end", function() {
                d3.select(this).classed("active", false);
            }));

    // Add an axis and title.
    g.append("g")
        .attr("class", "axis")
        .each(function(d) { 
            d3.select(this).call(d3.axisLeft(y[d])); 
        })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(d => d)
        .style("fill", "black");

    // Add and store a brush for each axis.
    g.append("g")
        .attr("class", "brush")
        .each(function(d) {
            d3.select(this).call(d3.brushY()
                .extent([[-8, 0], [8, height]])
                .on("brush", brushed)
                .on("end", brushed));
        });

    function brushed(event) {
        if (event.selection === null) return;
        const dimension = this.parentNode.__data__;
        const [y0, y1] = event.selection;
        
        svg.selectAll(".line")
            .style("stroke-opacity", d => {
                const value = y[dimension](d.features[dimension]);
                return value >= y0 && value <= y1 ? 0.7 : 0.1;
            });
    }

    // Add tooltips
    svg.selectAll(".line")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .style("stroke-width", 2)
                .style("stroke-opacity", 1)
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
                .style("stroke-width", 1.5)
                .style("stroke-opacity", 0.4);
            d3.selectAll(".tooltip").remove();
        });

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