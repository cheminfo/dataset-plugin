 /**
 * @object Dataset
 * Library that allows to load datasets and apply functions on the whole data.
 **/

var Dataset = {
		
	toJSON: function() {
		return "Dataset plugin";
	},
		
	// Initialization of global variables
	sizeLimit: 300,

    /**
    * 
    * @function	show(path, exportName, options)
    * This function generates a JSON that contains all the original data, possibly grouped by batch
    * 
    * @param	path:string			Path to the project data directory
    * @param	exportName:string	Name of the exported JSON for the visualizer
    * @param	options:+Object		Object containing the options
    *
    * @option	uniqueColumnName	Name of the column that contains the unique names in metadata files (default: "name")
    * @option	metaModifier		Modifier function that is applied to the metadata files. (Default: Creates a batchID column with the first part of the uniqueColumnName column)
    * @option	filenameModifier	Modifier function that is applied to the filenames. (Default: Keeps what's before the first underscore)
    *
    **/	

	show: function(path, exportName ,options) {
		
		options = options ? options : {};
		var uniqueColumnName = options.uniqueColumnName || "name";
		var metaModifier = options.metaModifier || function(entry) {
			if(entry[uniqueColumnName]) {
				if(!entry._batchID) {
					entry._batchID=entry[uniqueColumnName].replace(/_.*/,"");
				}
				if(!entry._id) {
					entry._id=entry[uniqueColumnName];
				}
			}
		};
		var filenameModifier = options.filenameModifier || function(filename) {
			return filename.replace(/_.*$/,"");
		};

    	var folders=File.dir(path);

		var results = {};
		var dataTypes = [];

		for(var i=0; i<folders.length; i++){
			var dataType=folders[i].replace(/^.*\/(.*)\/$/,"$1");

			var dataTypeCount={};
			dataTypes.push(dataTypeCount);
			dataTypeCount.name=dataType;

			var files=File.dir(folders[i]+"/original/");
			dataTypeCount.nb=files.length;

			for(var j=0; j<files.length; j++){
				var file=files[j];
				if (dataType=="metadata") {
					var entries=File.parse(file,{modifier:metaModifier});
					for(var k=0; k<entries.length; k++){
						var entry=entries[k];
						var batchID=entry._batchID;
						if (! results[batchID]) results[batchID]={};
						if (! results[batchID][dataType]) results[batchID][dataType]=[];
						results[batchID][dataType].push({
							id:entry._id, value:entry
						});
					}
				} else {
					var entry={};
					entry.name=file.replace(/.*\//,"");
					entry.data=Visualizer.getTypedURL(file);
					var batchID = filenameModifier(entry.name);
						if (! results[batchID]) results[batchID]={};
					if (! results[batchID][dataType]) results[batchID][dataType]=[];
					results[batchID][dataType].push(entry);
				}
			}
		}

		var resultArray=[];

		for (var key in results) {
			var entry=results[key];

			for(var i=0; i<folders.length; i++){
				var dataType=folders[i].replace(/^.*\/(.*)\/$/,"$1");
				var nbDataType="nb"+dataType.substring(0,1).toUpperCase()+dataType.substring(1);
				if (entry[dataType]) {
					entry[nbDataType]=entry[dataType].length;
				} else {
					entry[nbDataType]=0;
					entry[dataType]=[];
				}
			}
			resultArray.push({batch: key, info: entry});
		}
		jexport(exportName,{results: resultArray, dataTypes: dataTypes});
	},
	
	/**
	* @function load(source, filename)
	* This function allows to load a previously saved dataset
	* 
	* @param	source:string	Path to the data folder
	* @param	filename:string	The name of the file to load (used in Dataset.save)
	* 
	* @return	+Dataset
	**/
	load: function(source, filename) {
		console.info("Loading old dataset");
		var data=File.loadJSON(source+"/_json/"+filename+".json");
		var dataset=new Dataset.DataCollection(data.data,data.source);
		console.info("Dataset loaded with "+dataset.data.length+" elements.");
		return dataset;
	},

	/**
	* @function	loadData(source, options)
	* This function returns a new dataset.
	*
	* @param	source:string	Path to the data folder
	* @param	options:+Object	Object containing the options
	*
	* @option	version	Version(s) of the data to load. Can be : a string (1 version), an array of strings (several versions), an empty array (all versions) or a regular expression (default: "original")
	* @option	limit	Number of files to load (default: 20 ; 0 to load everything)
	* @option	subSet	Allows to load a subset of the data, based on a regular expression or a string that will be applied to the filename
	* @option	filenameFilter	Function to parse the filename into the unique name (default: function(name) { var reg = /^.*_[0-9]+/; return reg.exec(name)[0]; })
	* @option	metadata	Path to the metadata associated with the analysis (default: none)
	* @option	delimiter	If option metadata is specified : Field separator
	* @option	uniqueColumnName	If option metadata is specified : Name of the column that contains the unique keys (default: "name")
	* @option	metanameFilter	If option metadata is specified : Function to parse the unique name field to match with the parsed filename (default: function(name){return name;})
	* @option	batchDescription	Object that explains how to identify the batch or category. Default: {source:"filename", modifier: function(name){return name.replace(/_(.*)/,"");}}. Possible sources: filename, metadata. If source is metadata, a column property is needed.
	* 
	* @return	+Dataset
	**/
	loadData : function(source,options) {
		
		/* ********************************** */
		/* ************ OPTIONS ************* */
		/* ********************************** */
		
		options = options ? options : {};
		
		console.info("Starting Dataset.load ...");
		console.info("Treatment of the version option");
		var version = ["original"];
		if(options.version != undefined) {
			if((typeof options.version) == "string") version=[options.version];
			else if(options.version instanceof RegExp) {
				var versions = File.dir(source);
				var newVersion = [];

				for(var i=0; i<versions.length; i++) {
					var versionName = versions[i].replace(/^.*\/(.*)\/$/,"$1");
					if(options.version.test(versionName)) {
						newVersion.push(versionName);
					}
				}
				if(newVersion.length > 0) version=newVersion;
				else throw "No version found with the RegExp "+options.version.toString();
			}
			else if((options.version instanceof Array) && (options.version.length == 0)) {
				var versions = File.dir(source,{filter:/^[^_]{1}.*/});
				var newVersion = [];

				for(var i=0; i<versions.length; i++) {
					var versionName = versions[i].replace(/^.*\/(.*)\/$/,"$1");
					newVersion.push(versionName);
				}
				version=newVersion;
			}
			else if(!(options.version instanceof Array)) throw "Option version should be a string, a regular " +
					"expression or an array";
			else version = options.version;
		}
		
		console.info("Treatment of the metadata option");
		var metadata = {};
		if(options.metadata != undefined) {
			var uniqueColumnName = options.uniqueColumnName || "name";
			var metanameFilter = options.metanameFilter || function(value){return value;};
			var modifier = function(entry) {
				if(entry[uniqueColumnName]) {
					if(!entry._id) {
						entry._id=metanameFilter(entry[uniqueColumnName]);
					}
				}
			};
			var parsedMetadata = File.parse(options.metadata,{delimiter:options.delimiter, modifier:modifier});
			for(var i=0; i<parsedMetadata.length; i++) {
				metadata[parsedMetadata[i]._id]=parsedMetadata[i];
			}
		}
		
		console.info("Treatment of the filenameFilter option");
		var filenameFilter = options.filenameFilter || function(name) {
			var reg = /^.*_[0-9]+/;
			if(reg.test(name)){
				return reg.exec(name)[0];
			}
			else{
				return false;
			}
		};
		if(typeof filenameFilter != "function") {
			throw "Option filenameFilter must be a function";
		}
		
		console.info("Treatment of the limit/subSet options");
		var subSet="";
		if(options.subSet) {
			if((typeof options.subSet != "string") && !(options.subSet instanceof RegExp))
				throw "subSet option must be a string or a regular expression";
			else
				subSet = options.subSet;
		}

		var limit=20;
		if((options.limit != undefined) && (typeof options.limit == "number") && (options.limit > -1)) {
			limit = options.limit;
		}
		
		var batchDescription = options.batchDescription || {source:"filename", modifier: function(name){return name.replace(/_(.*)/,"");}};
		if((typeof batchDescription.source != "string") || (typeof batchDescription.modifier != "function"))
			throw "batchDescritpion must have the source (string) and modifier (function) properties";
		if(batchDescription.source == "metadata" && (typeof batchDescription.column != "string"))
			throw "Missing column property in the batchDescription object";

		/* ********************************** */
		/* ************** CODE ************** */
		/* ********************************** */
		
		console.info("Loading the versions");
		var folders={};
		for(var i=0; i<version.length; i++) {
			var files = File.dir(source+"/"+version[i],{filter:subSet}).sort();
			
			if(files.length==0) throw "Directory "+source+"/"+version[i]+" is empty or does not exist";
			if(limit > 0) files=files.slice(0,limit);
			if(i == 0 && files.length > Dataset.sizeLimit) {
				console.warn("You may not load more than "+Dataset.sizeLimit+" files. The dataset was reduced to the "+Dataset.sizeLimit+" first " +
						"files present in the folder","Dataset.load");
				files=files.slice(0,Dataset.sizeLimit);
			}	
			folders[version[i]]=files;
		}

		console.info("Checking that each loaded version contains the same data");
		var abcReg=/.*\/([^\/]+)\..*/;
		
		for(var abc in folders) {
			if(abc==version[0])
				continue;
			if(folders[version[0]].length > folders[abc].length)
				throw "Problem when loading the data : selected versions ("+version[0]+" & "+abc+") do not contain the same amount of data";
			for(var i=0; i<folders[version[0]].length; i++) {
				if(folders[version[0]][i].replace(abcReg,"$1") != folders[abc][i].replace(abcReg,"$1"))
					throw "Problem when loading the data : selected versions ("+version[0]+" & "+abc+") do not contain the same data";
			}
		}
		
		
		console.info("Add each element in the data object");
		var data=[];
		var len = folders[version[0]].length;
		
		
		for(var i=0; i<len; i++){
			var element={};
			data.push(element);
			var elementFile = folders[version[0]][i];
			element.id=elementFile.replace(/.*\/(.*)\.[^\.]*$/,"$1");
			element.name=filenameFilter(element.id);
			element.data={};
			element.color="#000000";
			for(var version2 in folders) {
				element.data[version2] = {
						filename: folders[version2][i],
						viewFile: Visualizer.getTypedURL(folders[version2][i])
				};
			}
			element.metadata = metadata[element.name] || {};
			
			if(batchDescription.source=="filename")
				element.batchID=batchDescription.modifier(element.id);
			else if(batchDescription.source=="metadata" && element.metadata[batchDescription.column])
				element.batchID=batchDescription.modifier(element.metadata[batchDescription.column]);
			
		}
		
		console.info("... end of Dataset.loadData");
		return new Dataset.DataCollection(data,source);
		
	},

	// Object that will be manipulated by the user
	DataCollection : function(data, source) {
		this.data = data;
		this.source = source;
		this.batches = false;
		this.getBatches();
	},
	
	processImage: function(dataCollection,method,parameters) {
		
		console.info("Starting Dataset.processImage (method: "+method+") ...");
		
		var data = dataCollection.data;
		var version=parameters[0];
		var destination=parameters[1];
		var processOption=parameters[2];
		var options=parameters[3] || {};
		
		if(method=="histogram"||method=="crop")
			options=processOption || {};
		
		var maskOptions = {imageFilter:"red"}, roisOptions = {};
		if(method=="split"){
			var transparent = options.transparent ? true : false;
			if(typeof options.darkBackground == "boolean"){
				if(options.darkBackground) maskOptions.darkBackground = true;
				else maskOptions.darkBackground = false;
			}
			if(processOption!="none") maskOptions.imageFilter = processOption;
			if(options.maskColor) maskOptions.maskColor = options.maskColor;
			if(options.method) maskOptions.method = options.method;
			
			if(options.scale) roisOptions.scale = options.scale;
			if(options.sortBy) roisOptions.sortBy = options.sortBy;
			if(options.minHeight) roisOptions.minHeight = options.minHeight;
			if(options.minSurface) roisOptions.minSurface = options.minSurface;
			if(options.maxLength) roisOptions.maxLength = options.maxLength;
			if(options.maxSurface) roisOptions.maxSurface = options.maxSurface;
			if(options.minWidth) roisOptions.minWidth = options.minWidth;
			if(options.minLength) roisOptions.minLength = options.minLength;
			if(options.maxHeight) roisOptions.maxHeight = options.maxHeight;
			if(options.maxWidth) roisOptions.maxWidth = options.maxWidth;
			
			var splitIndex = options.splitIndex || 0;
		}
		
		var allowedChars = /^[a-zA-Z0-9-]+$/;
		if(!allowedChars.test(destination)) throw "The destination name contains forbidden characters. Allowed characters are : a-z, A-z, 0-9 and -";
		if(!data[0]["data"][version]) throw "The specified version ("+version+") is not loaded or does not exist";
		if(dataCollection.getDataType(version) != "image") throw "This function can only be used on images";
		
		var saveEntry = function(data, image, newPath, newVersion){
			newPath=newPath.replace(/\.[a-zA-Z0-9]+$/,".png");
			image.save(newPath);
			data[i]["data"][newVersion]={filename: newPath, viewFile: Visualizer.getTypedURL(newPath), histogram: image.histogram()};
		};
		
		console.info("Treatment of the folder names");
		
		var initialDirectory=data[0]["data"][version]["filename"].replace(/\/[^\/]+$/,"");
		var initialSubDirectory=initialDirectory.replace(/.*\//,"");
		
		var newSubDirectory="error";
		if(initialSubDirectory=="original")
			newSubDirectory=destination;
		else
			newSubDirectory=initialSubDirectory+"_"+destination;
		
		var newDirectory = initialDirectory.replace(/[^\/]+$/,newSubDirectory);
		
		var subNames=[""];
		if(method=="filter") {
			if (processOption==Dataset.IJFilter.RGB)
				subNames=["Red","Green","Blue"];
			else if(processOption==Dataset.IJFilter.HSB)
				subNames=["Hue","Saturation","Brightness"];
		}
		
		for(var i=0; i<subNames.length; i++) {
			if(File.exists(newDirectory+subNames[i])==2) {
				if(!options.overwrite)
					throw ("The directory "+newSubDirectory+subNames[i]+" already exists. Choose another name or " +
							"make the overwrite option true.");
				else {
					var folderContent = File.dir(newDirectory+subNames[i]);
					for(var j=0; j<folderContent.length; j++) {
						File.remove(folderContent[j]);
					}
					File.remove(newDirectory+subNames[i]);
					console.warn("The content of directory "+newSubDirectory+subNames[i]+" has been overwritten. " +
							"Subtreatments may not be up to date","Dataset.processImage");
				}
			}
		}
		
		console.info("Treatment of each image");
		
		for(var i=0; i<data.length; i++) {
			
			var initialPath = data[i]["data"][version]["filename"];
			var filename = initialPath.replace(/.*\//,"");
			var newPath = newDirectory+"/"+filename;
			
			var image=IJ.load(initialPath);

			switch(method){
			case "resize":
				image.resize(processOption,options);
				saveEntry(data,image,newPath,newSubDirectory);
				break;
			case "crop":
				image.crop(options.x||0, options.y||0, options.width||1, options.height||1);
				saveEntry(data,image,newPath,newSubDirectory);
				break;
			case "filter":
				if(processOption==Dataset.IJFilter.RGB) {
					var rgb = image.splitRGB();
					saveEntry(data, rgb[0], newDirectory+"Red/"+filename, newSubDirectory+"Red");
					saveEntry(data, rgb[1], newDirectory+"Green/"+filename, newSubDirectory+"Green");
					saveEntry(data, rgb[2], newDirectory+"Blue/"+filename, newSubDirectory+"Blue");
				}
				else if(processOption==Dataset.IJFilter.HSB) {
					var hsb = image.splitHSB();
					saveEntry(data, hsb[0], newDirectory+"Hue/"+filename, newSubDirectory+"Hue");
					saveEntry(data, hsb[1], newDirectory+"Saturation/"+filename, newSubDirectory+"Saturation");
					saveEntry(data, hsb[2], newDirectory+"Brightness/"+filename, newSubDirectory+"Brightness");
				}
				else if(processOption==Dataset.IJFilter.GREY) {
					image.grey();
					saveEntry(data,image,newPath,newSubDirectory);
				}
				else if(processOption==Dataset.IJFilter.CONTRAST) {
					image.contrast();
					saveEntry(data,image,newPath,newSubDirectory);
				}
				else if(processOption==Dataset.IJFilter.TEXTURE) {
					image.texture();
					saveEntry(data,image,newPath,newSubDirectory);
				}
				else if(processOption==Dataset.IJFilter.EDGE) {
					image.edge();
					saveEntry(data,image,newPath,newSubDirectory);
				}
				else throw "The requested filter does not exist";
				break;
			case "histogram":
				var histogram = image.histogram();

				newPath = newPath.replace(/\.[a-zA-Z]+$/,".array");
				File.saveJSON(newPath,histogram);
				data[i]["data"][newSubDirectory]={filename: newPath, viewFile: Visualizer.getTypedURL(newPath), histogram:histogram};
				break;
				
			case "split":
				if(image.getNChannels()==1) image.rgb();
				var mask = image.createMask(maskOptions);
				
				var rois = mask.getRois(roisOptions);
				
				var split = image.split(rois);
				var splitMask = mask.split(rois);
				
				newPath = newPath.replace(/\.[a-zA-Z]+$/,".png");
				if(transparent) split[splitIndex].saveTransparentPng(newPath, splitMask[splitIndex]);
				else split[splitIndex].save(newPath);
				data[i]["data"][newSubDirectory]={filename: newPath, viewFile: Visualizer.getTypedURL(newPath)};
				break;
			}
		}
		console.info("... end of Dataset.processImage");
	},
	
	processSpectrum: function(dataCollection,method,parameters) {
		
		console.info("Starting Dataset.processSpectrum ...");
		
		var data = dataCollection.data;
		var version=parameters[0];
		var destination=parameters[1];
		var processOption=parameters[2];
		var options=parameters[3]||{};
		if(method=="fill" || method=="getArray")
			options=processOption||{};
		
		var allowedChars = /^[a-zA-Z0-9-]+$/;
		if(!allowedChars.test(destination)) throw "The destination name contains forbidden characters. Allowed characters are : a-z, A-z, 0-9 and -";
		if(!data[0]["data"][version]) throw "The specified version ("+version+") is not loaded or does not exist";
		if(dataCollection.getDataType(version) != "spectrum") throw "This function can only be used on spectra";
		
		var saveEntry = function(data, spectrum, newPath, newVersion){
			spectrum.save(newPath);
			data[i]["data"][newVersion]={filename: newPath, viewFile: Visualizer.getTypedURL(newPath)};
		};
		
		console.info("Treatment of the folder names");
		
		var initialDirectory=data[0]["data"][version]["filename"].replace(/\/[^\/]+$/,"");
		var initialSubDirectory=initialDirectory.replace(/.*\//,"");
		
		var newSubDirectory="error";
		if(initialSubDirectory=="original")
			newSubDirectory=destination;
		else
			newSubDirectory=initialSubDirectory+"_"+destination;
		
		var newDirectory = initialDirectory.replace(/[^\/]+$/,newSubDirectory);
		
		if(File.exists(newDirectory)==2) {
			if(!options.overwrite)
				throw ("The directory "+newSubDirectory+" already exists. Choose another name or " +
						"make the overwrite option true.");
			else {
				var folderContent = File.dir(newDirectory);
				for(var j=0; j<folderContent.length; j++) {
					File.remove(folderContent[j]);
				}
				File.remove(newDirectory);
				console.warn("The content of directory "+newSubDirectory+" has been overwritten. " +
						"Subtreatments may not be up to date","Dataset.processSpectrum");
			}
		}

		console.info("Treatment of each spectrum");
		
		for(var i=0; i<data.length; i++) {
			
			var initialPath = data[i]["data"][version]["filename"];
			var filename = initialPath.replace(/.*\//,"");
			var newPath = newDirectory+"/"+filename;
			
			var spectrum=SD.load(initialPath);

			var from = options.from || Math.min(spectrum.getFirstX(),spectrum.getLastX());
			var to = options.to || Math.max(spectrum.getFirstX(),spectrum.getLastX());
			
			switch(method){
			case "filter":
				if(processOption==Dataset.SDFilter.SNV) {
					spectrum.SNVFilter();
					saveEntry(data, spectrum, newPath, newSubDirectory);
				}
				else if(processOption==Dataset.SDFilter.BASELINE) {
					spectrum.YShift(-1*(spectrum.getMinY()));
					saveEntry(data, spectrum, newPath, newSubDirectory);
				}
				else if(processOption==Dataset.SDFilter.SQUARE) {
				    spectrum.powerFilter(2);
					saveEntry(data, spectrum, newPath, newSubDirectory);
				}
				else if(processOption==Dataset.SDFilter.SQUARE_ROOT) {
					spectrum.YShift(-1*(spectrum.getMinY()));
				    spectrum.powerFilter(0.5);
					saveEntry(data, spectrum, newPath, newSubDirectory);
				}
				else if(processOption==Dataset.SDFilter.LOG) {
					spectrum.YShift(-1*(spectrum.getMinY())+1);
				    spectrum.logarithmFilter(10);
					saveEntry(data, spectrum, newPath, newSubDirectory);
				}
				else if(processOption==Dataset.SDFilter.FIRST_DERIVATIVE) {
					spectrum.correlationFilter([-1,1]);
					saveEntry(data, spectrum, newPath, newSubDirectory);
				}
				else if(processOption==Dataset.SDFilter.SECOND_DERIVATIVE) {
					spectrum.correlationFilter([-1,1]);
					spectrum.correlationFilter([-1,1]);
					saveEntry(data, spectrum, newPath, newSubDirectory);
				}
				else throw "The requested filter does not exist";
				break;
			case "correlation":
				if(!(processOption instanceof Array)) throw "The correlation option has to be an array of numbers";
				spectrum.correlationFilter(processOption);
				saveEntry(data, spectrum, newPath, newSubDirectory);
				break;
			case "fill":
				var value = options.value || 0;
				if(value == -1)
					spectrum.suppressZone(from,to);
				else
					spectrum.fillWith(from,to,value);
				saveEntry(data, spectrum, newPath, newSubDirectory);
				break;
			case "getArray":
				var nbPoints = options.nbPoints || 	spectrum.getNbPoints();
				var array = spectrum.getEquallySpacedDataInt(from,to,nbPoints);
				newPath = newPath.replace(/\.[a-zA-Z]+$/,".array");
				File.saveJSON(newPath,array);
				data[i]["data"][newSubDirectory]={filename: newPath, viewFile: Visualizer.getTypedURL(newPath)};
				break;
			}
		}
		console.info("... end of Dataset.processSpectrum");
	}
};

/**
 * @object	Dataset.prototype
 * Methods of the Dataset object
 */

/**
* @function	toVisualizer(exportName)
* Converts the dataset in a JSON object and exports it.
*
* @param	exportName:string	Name of the JSON that will be generated
* 
**/
Dataset.DataCollection.prototype.toVisualizer = function(exportName) {
	var result=this.data;
	jexport(exportName, result);
};

/**
* @function	imageResize(version, destination, size, options)
* Scales the image to the specified width and height. See IJ.resize for more help
*
* @param	version:string		Version of the data to process
* @param	destination:string	Destination of the processed result
* @param	size:string			New image size in the format "widthxheight" or "percentage%"
* @param	options:+Object		Object containing the options
*
* @option	overwrite	Overwrite the destination folder if it already exists (default: false)
* 
**/
Dataset.DataCollection.prototype.imageResize = function(version, destination, size, options) {
	Dataset.processImage(this, "resize", arguments);
};

/**
* @function	imageFilter(version, destination, Dataset.IJFilter, options)
* Filters the image
* 
* @param	version:string		Version of the data to process
* @param	destination:string	Destination of the processed result
* @param	IJFilter:number		Filter to use
* @param	options:+Object		Object containing the options
* 
* @option	overwrite	Overwrite the destination folder if it already exists (default: false)
* 
* @example	dataset1.imageFilter("resized","edge",Dataset.IJFilter.EDGE)
**/
Dataset.DataCollection.prototype.imageFilter = function(version, destination, filterFunction, options) {
	Dataset.processImage(this, "filter", arguments);
};

/**
* @function	imageHistogram(version, destination, options)
* Generates a histogram from each image
* 
* @param	version:string			Version of the data to process
* @param	destination:string		Destination of the processed result
* @param	options:+Object			Object containing the options
* 
* @option	overwrite	Overwrite the destination folder if it already exists (default: false)
*
**/
Dataset.DataCollection.prototype.imageHistogram = function(version, destination, options) {
	Dataset.processImage(this, "histogram", arguments);
};

/**
 * @function imageSplit(version, destination, imageFilter, options)
 * Splits the image based on its contents. You should use imageSplitTest to optimize the options before applying it to the whole dataset.
 * 
 * @param	version:string			Version of the data to process
 * @param	destination:string		Destination of the processed result
 * @param	imageFilter:string		The filter to apply on the image before creating the mask.<br>Possible values : red, green, blue, hue, saturation, brightness, edge, texture, grey
 * @param	options:+Object			Object containing the options
 * 
 * @option	overwrite	Overwrite the destination folder if it already exists (default: false)
 * @option	IJ.createMask	
 * @option	IJ.split
 * @option	splitIndex	Position of the desired image in the splitted array (default: 0)
 * @option	transparent	Save as a transparent PNG (default: false)
 */
Dataset.DataCollection.prototype.imageSplit = function(version, destination, imageFilter, options) {
	Dataset.processImage(this, "split", arguments);
};

/**
 * @function imageCrop(version, destination, options)
 * Crops the image.
 * 
 * @param	version:string			Version of the data to process
 * @param	destination:string		Destination of the processed result
 * @param	options:+Object			Object containing the options
 * 
 * @option	overwrite	Overwrite the destination folder if it already exists (default: false)
 * @option 	x		horizontal value from which to start cutting. Default: 0
 * @option	y		vertical value from which to start cutting. Deafult: 0
 * @param 	width	width of the new image, if it is greater than the width of the original image minus the value of x, it calculates the width. Default: 1
 * @param 	height	height of the new image, if it is greater than the height of the original image minus the value of y, it calculates the height. Default: 1
 * 
 */
Dataset.DataCollection.prototype.imageCrop = function(version, destination, options) {
	Dataset.processImage(this, "crop", arguments);
};

/**
 * 
 * @function imageSplitTest(version, imageFilter, options)
 * Splits the image based on its contents. This function is useful to test different options to optimize the split. Results are stored in a temporary location.

 * @param	version:string		The version of the image that will be splitted (must be an unfiltered image)
 * @param	imageFilter:string	The filter to apply on the image before creating the mask.<br>Possible values : red, green, blue, hue, saturation, brightness, edge, texture, grey
 * 
 * @option	IJ.createMask
 * @option	IJ.split
 * @option	transparent	Save as a transparent PNG (default: false)
 * 
 */
Dataset.DataCollection.prototype.imageSplitTest = function(version, imageFilter, options) {
	
	options = options ? options : {};
	var results = [];
	
	var transparent = options.transparent ? true : false;
	
	var maskOptions = {};
	if(typeof options.darkBackground == "boolean"){
		if(options.darkBackground) maskOptions.darkBackground = true;
		else maskOptions.darkBackground = false;
	}
	if(imageFilter!="none") maskOptions.imageFilter = imageFilter;
	if(options.maskColor) maskOptions.maskColor = options.maskColor;
	if(options.method) maskOptions.method = options.method;
	
	var roisOptions = {};
	if(options.scale) roisOptions.scale = options.scale;
	if(options.sortBy) roisOptions.sortBy = options.sortBy;
	if(options.minHeight) roisOptions.minHeight = options.minHeight;
	if(options.minSurface) roisOptions.minSurface = options.minSurface;
	if(options.maxLength) roisOptions.maxLength = options.maxLength;
	if(options.maxSurface) roisOptions.maxSurface = options.maxSurface;
	if(options.minWidth) roisOptions.minWidth = options.minWidth;
	if(options.minLength) roisOptions.minLength = options.minLength;
	if(options.maxHeight) roisOptions.maxHeight = options.maxHeight;
	if(options.maxWidth) roisOptions.maxWidth = options.maxWidth;
	
	for(var i=0; i<this.data.length; i++){
		var result = {};
		results.push(result);

		var imagePath = this.data[i]["data"][version]["filename"];
		var image = IJ.load(imagePath);
		//if(image.getNChannels()==1) image.rgb();

		result.image = Visualizer.getTypedURL(imagePath);

		var maskImg = image.createMask(maskOptions);
		var rois = maskImg.getRois(roisOptions);
		
		var split = image.split(rois);
		var splitMask = maskImg.split(rois);
		
		var imgName = imagePath.replace(/^.*\//,"");
		var tmpDir = this.source+"/_split/"+imgName+"/";
		result.name=imgName;
		
		var paintedMask = image.paintMask(maskImg);
		paintedMask.save(tmpDir+"paintedMask.jpg");
		result.paintedMask = Visualizer.getTypedURL(tmpDir+"paintedMask.jpg");
		
		var paintedRois = image.paintRois(rois);
		paintedRois.save(tmpDir+"paintedRois.jpg");
		result.paintedRois = Visualizer.getTypedURL(tmpDir+"paintedRois.jpg");
		
		result.images=[];
		for(var j=0; j<split.length; j++){
			var saveName = tmpDir+"split/"+j+".png";
			if(transparent) split[j].saveTransparentPng(saveName,splitMask[j]);
			else split[j].save(saveName);
			result.images.push({label:"Split #"+j, value:Visualizer.getTypedURL(saveName)});
		}	
	}
	return results;
};

/**
* @function	spectrumFilter(version, destination, Dataset.SDFilter, options)
* Filters the spectra
* 
* @param	version:string		Version of the data to process
* @param	destination:string	Destination of the processed result
* @param	SDFilter:number		Filter to use
* @param	options:+Object		Object containing the options
* 
* @option	overwrite	Overwrite the destination folder if it already exists (default: false)
* 
* @example	dataset1.spectrumFilter("original", "snv", Dataset.SDFilter.SNV)
**/
Dataset.DataCollection.prototype.spectrumFilter = function(version, destination, filterFunction, options) {
	Dataset.processSpectrum(this, "filter", arguments);
};

/**
* @function	spectrumCorrelation(version, destination, correlation, options)
* Applies a correlation function to the spectra
*
* @param	version:string			Version of the data to process
* @param	destination:string		Destination of the processed result
* @param	correlation:[number]	Array containing the correlation vector
* @param	options:+Object			Object containing the options
* 
* @option	overwrite	Overwrite the destination folder if it already exists (default: false)
* 
* @example	dataset1.spectrumCorrelation("original", "corr1", [1,2,1])
**/
Dataset.DataCollection.prototype.spectrumCorrelation = function(version, destination, correlation, options) {
	Dataset.processSpectrum(this, "correlation", arguments);
};

/**
* @function	spectrumFillRegion(version, destination, options)
* Allows to fill a region of the spectra with a given number
* 
* @param	version:string			Version of the data to process
* @param	destination:string		Destination of the processed result
* @param	options:+Object			Object containing the options
* 
* @option	from	Start of the region (default : lowest x)
* @option	to	End of the region (default : highest x)
* @option	value	Value used to fill the region (default : 0). If value is set to -1, the region is suppressed
* @option	overwrite	Overwrite the destination folder if it already exists (default: false)
* 
* @example	dataset1.spectrumFillRegion("snv", "filled", {from:1400, to:1800})
**/
Dataset.DataCollection.prototype.spectrumFillRegion = function(version, destination, options) {
	Dataset.processSpectrum(this, "fill", arguments);
};

/**
* @function	spectrumGetArray(version, destination, options)
* Exports the spectra data in arrays of numbers. Possibility to select a region of the spectra
* 
* @param	version:string			Version of the data to process
* @param	destination:string		Destination of the processed result
* @param	options:+Object			Object containing the options
* 
* @option	from	Start of the selected region (default: lowest x)
* @option	to	End of the selected region (default: highest x)
* @option	nbPoints	Number of points in the exported array (default: same as the spectrum)
* @option	overwrite	Overwrite the destination folder if it already exists (default: false)
* 
**/
Dataset.DataCollection.prototype.spectrumGetArray = function(version, destination, options) {
	Dataset.processSpectrum(this, "getArray", arguments);
};

/**
* @function	removeSample(sample)
* Removes the given sample(s) from the dataset. Useful if you have outliers.
* 
* @param	sample:string	ID of the sample to remove or array of IDs
* 
* @example	dataset1.removeSample("0001_02")
**/
Dataset.DataCollection.prototype.removeSample = function(sample) {
	var samples=[];
	if(typeof sample == "string")
		samples = [sample];
	else if(sample instanceof Array)
		samples = sample;
	else
		console.warn("Dataset.removeSample: parameter sample has to be a string or an array. Nothing has been removed");
	for(var i=0; i<samples.length; i++){
		for(var j=0; j<this.data.length; j++){
			if(this.data[j].id == samples[i]){
				this.data.splice(j,1);
				break;
			}
		}
	}
	this.getBatches();
};

/**
* @function	getSimilarityMatrix(version, similarityFunction, options)
* Computes a similarity or distance matrix from the data
* 
* @param	version:string		The version of the data to use
* @param	similarityFunction	Either a custom function or the name of a predefined function from DM.Similarity or DM.Distance
* @param	options:+Object		Options for the comparator (DM.Comparator)
* 
* @return	+Matrix
* 
* @example	data.getSimilarityMatrix("split50",Distance.Function.EUCLIDEAN_DISTANCE)
**/
Dataset.DataCollection.prototype.getSimilarityMatrix = function(version, similarityFunction, options) {
	console.info("Starting Dataset.getSimilarityMatrix...");
	var comparator=false;
	if(typeof similarityFunction == "string") {
		options = options ? options : {};
		comparator = new DM.Comparator(similarityFunction, options);
	}
	else if(typeof similarityFunction == "function") {
		comparator={compare:similarityFunction, getMap:function(a){return a;}}; // Simulate comparator object
	}
	else throw "similarityFunction must be a function";
	
	var dataType = this.getDataType(version);
	switch(dataType) {
	/*case "image":
		var load = function(file) {
			return IJ.load(file);
		};
		break;*/
	case "array":
		var load = function(file) {
			var fileContent=File.loadJSON(file);
			return comparator.getMap(fileContent);
		};
		break;
	default:
		throw "The datatype ("+dataType+") can not be used to compute similarities";
	}
	
	//Load all the data based on the filename found in the DataCollection object
	//At the same time, create the empty similarity matrix
	var loadedFiles = [];
	var similarity = [];
	var len=this.data.length;
	console.info("Loading data (version: "+version+")");
	for(var i=0; i<len; i++) {
		var loadedFile = load(this.data[i]["data"][version]["filename"]);
		loadedFiles.push(loadedFile);
		
		similarity[i]=[];
	}
	console.info("Computing similarities ("+((len*len/2)-(len/2))+" pairs)");
	//Calculation of the similarities
	for(var i=0; i<len; i++) {
		console.info("Processing row "+(i+1)+"/"+len);
		for(var j=i; j<len; j++) {
			similarity[i][j]=comparator.compare(loadedFiles[i],loadedFiles[j]);
			similarity[j][i]=similarity[i][j];
		}
	}
	console.info("...end of Dataset.getSimilarityMatrix");
	return new Matrix(similarity);
};

/**
* @function	getTargetMatrix(options)
* Computes a target matrix from the dataset
* 
* @param	options:+Object	Object containing the options
* 
* @option	metadataField	Name of the metadata field where the category is found
* @option	filterFunction	Function that will match the category from the filename (default : only keeps what's before first "_") or metadataField (if specified)
* 
* @return	+Matrix
**/
Dataset.DataCollection.prototype.getTargetMatrix = function(options) {
	
	options = options ? options : {};
	
	var metadataField = options.metadataField || false;
	var filterFunction = options.filterFunction || function(name){
		var reg=/_.*$/;
		return name.replace(reg,"");
	};
	
	var names=[];
	for(var i=0; i<this.data.length; i++){
		if(metadataField)
			names.push(this.data[i].metadata[metadataField]);
		else {
			var keys = [];
			for(var k in this.data[i].data) keys.push(k);
			names.push(this.data[i].data[keys[0]].filename.replace(/.*\/(.*)\.[a-zA-Z0-9]+$/,"$1"));
		}
			
	}
	
	var sameClass = function(name1,name2){
		if(filterFunction(name1)==filterFunction(name2))
			return 1;
		else
			return 0;
	};
	
	var target=[];
	for (var i=0;i<this.data.length;i++) {
		target[i]=[];
	}
	// 1 for a same class and 0 for a different class
	for (var i=0;i<this.data.length;i++) {
		for (var j=i; j<this.data.length; j++) {
			target[i][j]=sameClass(names[i],names[j]);
			target[j][i]=target[i][j];
		}
	}
	return new Matrix(target);
};

/**
* @function	getDataType(version)
* Returns the data type present in the specified version
* 
* @param	version:string	The version of the data
* 
* @return	string
* 
**/
Dataset.DataCollection.prototype.getDataType = function(version) {
	var file = this.data[0].data[version].filename;
	var extension = file.replace(/.*\./,"").toLowerCase();
	
	switch(extension) {
	case "jpg":
	case "jpeg":
	case "png":
	case "tif":
	case "tiff":
	case "gif":
		return "image";
	case "jdx":
	case "dx":
		return "spectrum";
	case "array":
		return "array";
	default:
		return "unknown";
	}
};

/**
* @function	save(filename)
* Saves the dataset to the specified filename
* 
* @param	filename:string	Name of the data file
* 
* @example	dataset.save("treatments1");
**/
Dataset.DataCollection.prototype.save = function(filename) {
	File.saveJSON(this.source+"/_json/"+filename+".json",JSON.stringify({data:this.data,source:this.source}));
};

/**
* @function	pca(version, options)
* Performs a Principal Component Analysis on the given version
* 
* @param	version:string	Version of the data
* @param	options:+Object	Object containing the options
* 
* @option	nPC	Number of components to compute (default: 2)
* 
* @return +Object
**/
Dataset.DataCollection.prototype.pca = function(version, options) {
	console.info("Starting Dataset.pca...");
	
	if(this.getDataType(version) != "array") throw "PCA can only be applied on arrays";
	options = options ? options : {};
	var nPC = options.nPC || 2;
	
	console.info("Loading the data (version: "+version+")");
	
	var arrays = [];
	for(var i=0; i<this.data.length; i++){
		var content = File.loadJSON(this.data[i].data[version].filename);
		arrays.push(content);
	}
	
	var pca_options={
		'nPC': nPC
	};
	
	console.info("Computing PCA");
	var pca = DataMining.filter.pca(arrays,pca_options);
	if(options.pca2)
		return pca;
	
	/*var newPCA={};
	newPCA.nPC=nPC;
	newPCA.data=this.data;
	newPCA.variance=pca.model.variance;
	for(var i=1; i<=nPC; i++){
		newPCA["PC"+i]=[];
	}
	
	for(var i=0; i<pca.data.length; i++){
		for(var j=1;j<=nPC;j++){
			newPCA["PC"+j].push(pca.data[i][j-1]);
		}
	}*/
	
	//console.info("...end of Dataset.pca");
	return pca;
};

Dataset.DataCollection.prototype.pca2 = function(version, options) {
	options = options ? options : {};
	options.pca2 = true;
	
	var pca = this.pca(version, options);
	var pcaData = pca.data;
	var info = this.data;
	var profile = this.batches;
	
	function createEntry(xy,batch,key){
		  var entry = {_highlight:batch[0].batchID,o:0.2,l:key};
		  //Plot the loadings
		  var EVD = PCA.pcaEVD(xy,{});
		  var V = EVD.getV().toArray2();
		  var D = EVD.getD().toArray2();

		  entry.w=Math.sqrt(D[0][0])*2;
		  entry.h=Math.sqrt(D[1][1])*2;
		  
		  entry.c="#"+hex_md5(key).substring(0,6);
		  entry.lc=entry.c;
		  entry.n="none";
		  entry.a=Math.atan(V[0][1]/V[0][0])*180/Math.PI;
		  //The determinant will tell us if there is an axe reflection.
		  entry.a*=-(V[0][0]*V[1][1]-V[1][0]*V[0][1]);
		  entry.x=0;
		  entry.y=0;
		  for(var i=xy.length-1;i>=0;i--){
		    entry.x+=xy[i][0];
		    entry.y+=xy[i][1];
		  }
		  entry.x=(entry.x/xy.length)+50;
		  entry.y=(entry.y/xy.length)+50;

		  return entry;
		}
	
	var series = [];
	var elements = new Array(pcaData.length);
	for(var i=0; i<pcaData.length; i++){
		elements[i]={x:pcaData[i][0]*10,y:pcaData[i][1]*10,c:info[i].color,o:1,_highlight:[info[i].batchID]};
		elements[i].w=0.2;
		elements[i].h=0.2;
		elements[i].a=0;
		elements[i].l=info[i].id;
		elements[i].lc=elements[i].c;
		elements[i].n="none";
		elements[i].jcamp=info[i].data[version].viewFile;
		info[i].i=i;
	}
	var serie = {};
	serie.label="PCA of "+version;
	serie.category="Spectra";
	serie.data=elements;
	series.push(serie);
	
	var family = [];
	for (var key in profile) {
	    if (profile.hasOwnProperty(key)) {
	      var batch=profile[key];
	      var xy = new Array(batch.length);
	      for(var i=0; i<batch.length; i++) {
	    	  xy[i]=[pcaData[batch[i].i][0]*10,pcaData[batch[i].i][1]*10];
		  }
	      family.push(createEntry(xy,batch,key));
	    }
	}
	

	var serieCC={};
	serieCC.label="Batches";
	serieCC.category="Components";
	serieCC.data=family;
	series.push(serieCC);
	
	var scatter = {};
	scatter.series=series;
	scatter.xAxis={'label':'My X axis','minValue':0,'maxValue':1};
	scatter.yAxis={'label':'My Y axis'};
	scatter.title="My graph";
	scatter.minX=0;
	scatter.maxX=100;
	scatter.minY=0;
	scatter.maxY=100;

	jexport('spectra',elements);
	jexport('components',family);
	jexport('scatter',{type:"loading", value:scatter});
	
};

/**
* @function	cluster(version, DistanceFunction ,options)
* Performs a Hierarchical clustering on the given version
* 
* @param	version:string		Version of the data
* @param	DistanceFunction	Either a custom function or the name of a predefined function
* @param	options:+Object		Object containing the options
* 
* @option	image	Version of the data that contains a displayable image for the nodes
* @option	similarityMatrix	If you already computed the similarity matrix for the chosen version, pass it to this option (DistanceFunction parameter will be ignored)
* 
* @return	+Object
**/
Dataset.DataCollection.prototype.cluster = function(version, distanceFunction ,options) {
	
	console.info("Starting Dataset.cluster...");
	options = options ? options : {};
	
	console.info("Creating similarity matrix");
	var similarity;
	if(options.similarityMatrix && options.similarityMatrix instanceof Matrix){
		similarity = options.similarityMatrix;
	}
	else{
		similarity = this.getSimilarityMatrix(version,distanceFunction);
	}
	
	var data = this.data;
	
	console.info("Creating labels for dendrogram");
	var labels = [];
	for(var i=0; i<data.length; i++){
		labels.push({
			element: i,
			label: data[i].id,
			data: data[i],
			"image": options.image ? data[i].data[options.image].viewFile : null,
			"$height": 10,
			"$width": 10,
			"$dim": 20,
			"$color": data[i].color,
			"$label-size":"20px"
		});
	}
	
	console.info("Creating dendrogram.");
	var tree = {type:"tree",value:Distance.clustering(similarity.toArray2D(),labels)};
	
	console.info("...end of Dataset.cluster");
	return tree;
};

Dataset.DataCollection.prototype.getBatches = function(){
	if(this.data[0].hasOwnProperty("batchID")){
		this.batches = {};
		for(var i=0; i<this.data.length; i++){
			var batchID=this.data[i].batchID;
			if(!this.batches.hasOwnProperty(batchID))
				this.batches[batchID]=[];
			this.batches[batchID].push(this.data[i]);
		}
		
		var len = Object.keys(this.batches).length;
		var colors = Color.getDistinctColors(len);
		
		var index=0;
		for(var arr in this.batches){
			for(var j=0; j<this.batches[arr].length; j++){
				this.batches[arr][j].color=colors[index];
			}
			index++;
		}
	}
};

/**
 * @object Dataset.SDFilter
 * Pseudo-library that displays the possible filters for spectra in datasets
 */
Dataset.SDFilter = {
	/**
	 * @property	SNV number
	 * Standard Normal Variate
	 */
	SNV : 1,
	
	/**
	 * @property	BASELINE number
	 * Correction of the baseline (Spectrum is shifted so that the lowest point is set to 0)
	 */
	BASELINE : 2,
	
	/**
	 * @property	FIRST_DERIVATIVE number
	 * Calculates the first derivative of the spectrum
	 */
	FIRST_DERIVATIVE : 3,
	
	/**
	 * @property	SECOND_DERIVATIVE number
	 * Calculates the second derivative of the spectrum
	 */
	SECOND_DERIVATIVE : 4,
	
	/**
	 * @property	SQUARE number
	 * Calculates the square of each point of the spectrum
	 */
	SQUARE : 5,
	
	/**
	 * @property	SQUARE_ROOT number
	 * Calculates the square root of each point of the spectrum.<br>The BASELINE filter is automatically applied before to avoid negative values
	 */
	SQUARE_ROOT : 6,
	
	/**
	 * @property	LOG number
	 * Calculates the base 10 logarithm of each point of the spectrum.<br>The spectrum is automatically shifted before so that its minimum is 1
	 */
	LOG : 7,
	
};

/**
 * @object Dataset.IJFilter
 * Pseudo-library that displays the possible filters for images in datasets
 */

Dataset.IJFilter = {
	/**
	 * @property	RGB	number
	 * Apply filter to generate 3 pictures: red, green, blue
	 */
	RGB:1,
	
	/**
	 * @property	HSB	number
	 * Apply filter to generate 3 pictures: hue, saturation, brightness
	 */
	HSB:2,
	
	/**	
	 * @property	GREY number
	 * Apply filter to convert the image to grayscale
	 */
	GREY:3,
	
	/**
	 * @property	CONTRAST number
	 * Apply filter to create a contrast image
	 */
	CONTRAST:4,
	
	/**
	 * @property	TEXTURE number
	 * Apply filter to create a texture image
	 */
	TEXTURE:5,
	
	/**
	 * @property	EDGE number
	 * Apply filter to create an edge image
	 */
	EDGE:6
};