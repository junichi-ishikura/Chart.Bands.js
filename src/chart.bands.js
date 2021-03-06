var Chart, helpers, supportedTypes, addLegendColourHelper, isSupported, colourProfile, defaultOptions;

//setup
Chart = require('Chart');
Chart = typeof(Chart) === 'function' ? Chart : window.Chart;
helpers = Chart.helpers;
isSupported = true;
colourProfile = 'borderColor';
baseColor = [];

supportedTypes = {
    'bubble': 'backgroundColor',
    'line': 'borderColor'
};
addLegendColourHelper = {
    'borderColor': 'backgroundColor',
    'backgroundColor': 'borderColor'
};
Chart.Bands = Chart.Bands || {};

defaultOptions = Chart.Bands.defaults = {
    bands: {
        yValueMin: false,
        yValueMax: false,
        bandLine: {
            stroke: 0.01,
            colour: 'rgba(0, 0, 0, 1.000)',
            type: 'solid',
            label: '',
            fontSize: '12',
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            fontStyle: 'normal'
        },
        belowMinThresholdColour: [
            'rgba(0, 255, 0, 1.000)'
        ],
        aboveMaxThresholdColour: [
            'rgba(0, 255, 0, 1.000)'
        ]
    }
};

function addBandLine (ctx, scale, constraints, options) {
    var yPoses = [
            scale.getPixelForValue(options.yValueMin),
            scale.getPixelForValue(options.yValueMax)
            ],
        bandLine = options.bandLine;

    yPoses.forEach(function(yPos) {
        if (bandLine.type === 'dashed') {
            for (var i = constraints.start; i < constraints.stop; i = i + 6) {
                drawBandLine(ctx, yPos, i, i + 4, bandLine.stroke, bandLine.colour);
            }
        } else {
            drawBandLine(ctx, yPos, constraints.start, constraints.stop, bandLine.stroke, bandLine.colour);
        }

        if(bandLine.label !== undefined && bandLine.label.length > 0) {

            addBandLineLabel(
                ctx,
                bandLine,
                {
                    'x': constraints.start,
                    'y': constraints.top - options.bandLine.fontSize * 2
                }
            );
        }
    });
}

function drawBandLine (ctx, yPos, start, stop, stroke, colour) {
    ctx.beginPath();
    ctx.moveTo(start, yPos);
    ctx.lineTo(stop, yPos);
    ctx.lineWidth = stroke;
    ctx.strokeStyle = colour;
    ctx.stroke();
}

function addBandLineLabel (ctx, options, position) {
    ctx.font = helpers.fontString(options.fontSize, options.fontStyle, options.fontFamily);
    ctx.fillStyle = options.colour;
    ctx.fillText(options.label, position.x, position.y);
    if (options.type === 'dashed') {
        for (var i = 10; i < position.x - 10; i = i + 6) {
            drawBandLine(ctx, (position.y + options.fontSize * 0.5), i, i + 4, options.stroke, options.colour);
        }
    } else {
        drawBandLine(ctx, position.y, 10, position.x - 10, options.stroke, options.colour);
    }
}

function pluginBandOptionsHaveBeenSet (bandOptions) {
    return (typeof bandOptions.belowMinThresholdColour === 'object' && bandOptions.belowMinThresholdColour.length > 0 && typeof bandOptions.yValueMin === 'number');
}

function calculateGradientFill (ctx, scale, height, baseColor, minGradientColor, maxGradientColor, minValue, maxValue) {
    var yPosMin = scale.getPixelForValue(minValue),
        gradientStopMin = 1 - (yPosMin / height),
        yPosMax = scale.getPixelForValue(maxValue),
        gradientStopMax = 1 - (yPosMax / height),
        grd = ctx.createLinearGradient(0, height, 0, 0);
    try {
        grd.addColorStop(0, minGradientColor);
        grd.addColorStop(gradientStopMin, minGradientColor);
        grd.addColorStop(gradientStopMin, baseColor);
        grd.addColorStop(gradientStopMax, baseColor);
        grd.addColorStop(gradientStopMax, maxGradientColor);
        grd.addColorStop(1.00, maxGradientColor);

        return grd;
    } catch (e) {
        console.warn('ConfigError: Chart.Bands.js had a problem applying one or more colors please check that you have selected valid color strings');
        return baseColor;
    }
}

function isPluginSupported (type) {

    if (!!supportedTypes[type]) {
        colourProfile = supportedTypes[type];
        return;
    }
    console.warn('Warning: The Chart.Bands.js plugin is not supported with chart type ' + type);
    isSupported = false;
}

var BandsPlugin = Chart.PluginBase.extend({
    beforeInit: function (chartInstance) {
        isPluginSupported(chartInstance.config.type);
        // capture the baseColors so we can reapply on resize.
        for (var i = 0; i < chartInstance.chart.config.data.datasets.length; i++) {
            baseColor[i] = chartInstance.chart.config.data.datasets[i][colourProfile];
        }
    },

    afterScaleUpdate: function (chartInstance) {
        var node,
            bandOptions,
            fill;

        if(isSupported === false) { return ; }

        node = chartInstance.chart.ctx.canvas;
        bandOptions = helpers.configMerge(Chart.Bands.defaults.bands, chartInstance.options.bands);

        if (pluginBandOptionsHaveBeenSet(bandOptions)) {

            for (var i = 0; i < chartInstance.chart.config.data.datasets.length; i++) {
                fill = calculateGradientFill(
                                        node.getContext("2d"),
                                        chartInstance.scales['y-axis-0'],
                                        chartInstance.chart.height,
                                        baseColor[i],
                                        bandOptions.belowMinThresholdColour[i],
                                        bandOptions.aboveMaxThresholdColour[i],
                                        bandOptions.yValueMin,
                                        bandOptions.yValueMax || chartInstance.scales['y-axis-0'].end
                                    );
                console.log("aaa");
                chartInstance.chart.config.data.datasets[i][colourProfile] = fill;
            }
        } else {
            console.warn('ConfigError: The Chart.Bands.js config seems incorrect');
        }
    },

    afterDraw: function(chartInstance) {
        var node,
            bandOptions;

        if(isSupported === false) { return ;}

        node = chartInstance.chart.ctx.canvas;
        bandOptions = helpers.configMerge(Chart.Bands.defaults.bands, chartInstance.options.bands);

        if (typeof bandOptions.yValueMin === 'number') {
            addBandLine(
                node.getContext("2d"),
                chartInstance.scales['y-axis-0'],
                {
                    'top': chartInstance.chartArea.top,
                    'start': chartInstance.chartArea.left,
                    'stop': chartInstance.chartArea.right,
                },
                bandOptions
            );

        } else {
            console.warn('ConfigError: The Chart.Bands.js plugin config requires a yValueMin');
        }
    }
});

Chart.pluginService.register(new BandsPlugin());