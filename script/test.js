Visualizer={};
Visualizer.getTypedURL=function(filename) {
	File.getReadURL = function(){return "";};
  var extension=filename.replace(/.*\./,"").toLowerCase();
  var type=extension;
  switch (extension) {
    case "gif":
    case "png":
    case "jpeg":
    case "jpg":
      return {type: type, value: File.getReadURL(filename)};
      
    case "dx":
    case "jdx":
      type="jcamp";
      break;
  }
  return {type: type, url: File.getReadURL(filename)};
};

var dataset = Dataset.loadData("script/data/button/image/",
                            {
                              version:["original"],
                              limit: 10
                            });

//dataset.imageResize("50%","original","resized50",{});
//dataset.imageFilter("hsb","resized50","hsb",{});
dataset.toVisualizer("data",{type:"stats"});