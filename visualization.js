// Set the dimensions and margins of the visualization
const margin = {top: 30, right: 50, bottom: 30, left: 50};
const width = 1200 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create the SVG container
const svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Load the data
d3.json("processed_data.json").then(function(data) {
    // Extract feature names
    const features = Object.keys(data[0].features);
    
    // Create scales for each feature
    const scales = {};
    features.forEach(feature => {
        scales[feature] = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);
    });

    // Create the parallel coordinates
    const line = d3.line()
        .x(d => d.x)
        .y(d => d.y);

    // Create axes
    const axes = svg.selectAll(".axis")
        .data(features)
        .enter()
        .append("g")
        .attr("class", "axis")
        .attr("transform", (d, i) => `translate(${i * (width / (features.length - 1))},0)`);

    // Add axes lines
    axes.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", height);

    // Add axes labels
    axes.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .text(d => d)
        .attr("transform", "rotate(-45)")
        .style("font-size", "10px");

    // Add the lines
    const lines = svg.selectAll(".line")
        .data(data)
        .enter()
        .append("path")
        .attr("class", "line")
        .style("stroke", d => d3.interpolateViridis(d.hit_count / 9))
        .style("stroke-width", 1.5)
        .attr("d", d => {
            const points = features.map((feature, i) => ({
                x: i * (width / (features.length - 1)),
                y: scales[feature](d.features[feature])
            }));
            return line(points);
        });

    // Add tooltips
    lines.on("mouseover", function(event, d) {
        d3.select(this)
            .style("stroke-width", 3)
            .style("opacity", 1);

        // Show tooltip
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background-color", "white")
            .style("padding", "10px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "5px")
            .style("pointer-events", "none");

        tooltip.html(`
            <strong>${d.track_name}</strong><br>
            Artist: ${d.artists}<br>
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
            .style("opacity", 0.7);
        d3.selectAll(".tooltip").remove();
    });

    // Add brush functionality
    axes.each(function(d) {
        const axis = d3.select(this);
        const brush = d3.brushY()
            .extent([[-10, 0], [10, height]])
            .on("brush", brushed);

        axis.append("g")
            .attr("class", "brush")
            .call(brush);
    });

    function brushed(event) {
        if (!event.selection) return;

        const [y0, y1] = event.selection;
        const feature = features[event.target.parentNode.__data__];

        lines.classed("selected", function(d) {
            const value = scales[feature](d.features[feature]);
            return value >= y0 && value <= y1;
        });
    }
}); 