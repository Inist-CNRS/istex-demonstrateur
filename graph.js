var logger=require('logger');
var express=require('express');
var app =express();

var d3 = require('d3'), 
jsdom = require('jsdom'),
dataviz='<div id="dataviz-container"></div>';

var model=require("clusters");

var resultats=Object();

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/scripts'));
cluster0 = new model.Cluster("0");
cluster1 = new model.Cluster("1");
cluster0.addTarget(cluster1);

var parsedJSON = require('./public/data/diachro.json');
clustersSrc={};
clustersTarget={};
for (i in parsedJSON) {
	cluster=parsedJSON[i];
	src=cluster.ClusterSource;
	target=cluster.ClusterTarget;
	if (typeof(clustersSrc[src]) == "undefined") {
		clustersSrc[src] = new model.Cluster(src);
	}
	if (typeof(clustersTarget[target]) == "undefined") {
		clustersTarget[target] = new model.Cluster(target);
	}
	clustersSrc[src].addTarget(clustersTarget[target]);
}

/*logger.debug("Clusters sources |>");
logger.debug(clustersSrc);
logger.debug("Clusters targets |>");
logger.debug(clustersTarget);*/
app.use(function(req,res,next) {
           
    jsdom.env(
    	dataviz,
    	function(errors, window) {
            var el = window.document.querySelector('#dataviz-container');

            width=800;
            height=300;
            margin=50;
            padding=20
            var svg = d3.select(el).append("svg")
                        .attr("width", width)
                        .attr("height", height).style("padding","10px");

            //---------------------------------------------------------------------------Feeding src and target lists
            SrcList=[];
            for (key in clustersSrc) {
                SrcList.push(clustersSrc[key]);
            }
            TargetList=[];
            for (key in clustersTarget) {
                TargetList.push(clustersTarget[key]);
            }

            //---------------------------------------------------------------------------Fixing parameters
            var srcHeightClusterMax=0;
            var targetHeightClusterMax=0;
            var sizeClsSrc= ((width - 2 * margin) - (padding*(SrcList.length))) /SrcList.length;
            var sizeClsTarget= ((width - 2 * margin) - (padding*(TargetList.length))) /TargetList.length;
            var relativeHeightSrc=height/4;
            var relativeHeightTarget=3*height /4;
            var colors=d3.scale.category10();

            //---------------------------------------------------------------------------Getting max radius for src and target
            for (key in clustersSrc) {
                height_tmp = clustersSrc[key].target.length*10+padding;
                if (height_tmp  > srcHeightClusterMax)
                    srcHeightClusterMax=height_tmp;
            }
            for (key in clustersTarget) {
                height_tmp = clustersTarget[key].src.length*10+padding;
                if (height_tmp  > targetHeightClusterMax)
                    targetHeightClusterMax=height_tmp;
            }

            //---------------------------------------------------------------------------Drawing Rectangles
            svg.append("rect")
                .attr("y",function(d){return relativeHeightSrc - srcHeightClusterMax -margin /2;})
                .attr("x",function(d,i){return margin-padding;})
                .attr("rx","1")
                .attr("ry","1")
                .attr("class","SrcList")
                .attr("width",(SrcList.length*sizeClsSrc)+margin)
                .attr("height",srcHeightClusterMax+ 2*margin);
            svg.append("rect")
                .attr("y",function(d){return relativeHeightTarget - targetHeightClusterMax -margin /2;})
                .attr("x",function(d,i){return margin-padding;})
                .attr("rx","1")
                .attr("class","TargetList")
                .attr("ry","1")
                .attr("width",TargetList.length*sizeClsTarget+margin)
                .attr("height",targetHeightClusterMax + 2*margin);

            logger.debug("Drawing sources"); //----------------------------------------Drawing Cluster sources
            svg.selectAll("circle").data(SrcList).enter().append("circle")
            .attr("cy",function(d){d.y = relativeHeightSrc; return d.y;})
            .attr("cx",function(d,i){d.x = (i*sizeClsSrc)+2*margin; return d.x;})
            .attr("r",function(d){ 
                height_tmp = d.target.length*10+padding;
                //if (height_tmp  > srcHeightClusterMax)
                //    srcHeightClusterMax=height_tmp;
                return height_tmp;
            })
            .attr("class","ClusterSource")
            .attr("title",function(d){return d.name.replace(/\s/g, '');});
            logger.debug("End drawing sources");


            logger.debug("Drawing targets");//----------------------------------------Drawing Cluster targets
            svg.selectAll(".target").data(TargetList).enter().append("circle")
            .attr("cy",function(d){d.y = relativeHeightTarget; return d.y;})
            .attr("cx",function(d,i){d.x = (i*sizeClsTarget)+2*margin; return d.x;})
            .attr("class", "ClusterTarget")
            .attr("title",function(d){return d.name.replace(/\s/g, '');})
            .attr("r",function(d){
                height_tmp = d.src.length*10+padding;
                //if (height_tmp  > targetHeightClusterMax)
                //    targetHeightClusterMax=height_tmp;
                return height_tmp;
            });

            

            //---------------------------------------------------------------------------Adding the Cluster labels
            logger.debug("Drawing labels");
            var labels = svg.selectAll("text");
            labels.data(SrcList).enter().append("text")
            .text(function(d){return d.name;})
            .attr("y",relativeHeightSrc)
            .attr("x",function(d,i){return (i*sizeClsSrc)+2*margin;});
            labels.data(TargetList).enter().append("text")
            .text(function(d){return d.name;})
            .attr("y",relativeHeightTarget)
            .attr("x",function(d,i){return (i*sizeClsTarget)+2*margin;});


            //---------------------------------------------------------------------------Adding the edges between clusters
            var Line = function(x1,y1, srcName,x2,y2,targetName,color){
                this.x1 = x1;
                this.y1 = y1;
                this.x2 = x2;
                this.y2 = y2;
                this.srcName=srcName.replace(/\s/g, '');
                this.targetName=targetName.replace(/\s/g, '');
                this.color = color;
            };

            logger.debug("Drawing links");
            var lines = [];
            for (i in SrcList) {
                c=SrcList[i];
                var lineColor = colors.range()[i];//'#'+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6);
                for(var i=0;i < c.target.length;i++){
                    var target = clustersTarget[c.target[i]];
                    lines.push(new Line(c.x, c.y,c.name, target.x, target.y,target.name, lineColor));
                }
            };
            svg.selectAll("line").data(lines).enter().append("line")
            .style("stroke", function(d){return d.color;})
            .style("stroke-width", "5px")
            .style("stroke-opacity", "0.2")
            .attr("x1",function(d){return d.x1;})
            .attr("y1",function(d){return d.y1;})
            .attr("x2",function(d){return d.x1;})
            .attr("y2",function(d){return d.y1;})
            .attr("x2",function(d){return d.x2;})
            .attr("y2",function(d){return d.y2;})
            .attr("src", function(d){return d.srcName.replace(/\s/g, '');})
            .attr("target", function(d){return d.targetName.replace(/\s/g, '');});
            var svgsrc = window.document.querySelector('#dataviz-container').innerHTML;
            res.render('bipartite.ejs', {objectResult: svgsrc});
            
        }
    );
})
.listen(8080);