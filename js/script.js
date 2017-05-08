var currentLocation;

var map;
var inforWindow;
var geocoder;

var file = "";

function checkSubmit(event){
    if(event.keyCode == 13){
        validateInput();
    }
}

function validateInput(){
	var str = document.getElementById("search").value;
	if(str){
		geocode(str, function(result){
            var contents = document.getElementById("section-map-current");
            removeChildren(contents);

			currentLocation = {lat: result.geometry.location.lat(), lng: result.geometry.location.lng()};
			infoWindow.setContent(result.formatted_address);
				
            updateLocations([result], contents, false);
            updateMap();
        });
	}
}

function initMap() {
    currentLocation = {lat: 0.0, lng: 0.0};
    map = new google.maps.Map(document.getElementById('currentLocationMap'), {
      scrollwheel: false,
      zoom: 10
    });
    geocoder = new google.maps.Geocoder;
    infoWindow = new google.maps.InfoWindow({map: map});

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            currentLocation = {lat: position.coords.latitude, lng: position.coords.longitude};
			
            reverseGeocode(currentLocation, function(result){
                infoWindow.setContent(result.formatted_address);
				
				var contents = document.getElementById("section-map-current");
                removeChildren(contents);
                updateLocations([result], contents, false);
            });
            updateMap();
        }, function() {
            alert("Browser could not access geolocation data. Please run locally.");
        });
    } else {
        alert("Browser could not access geolocation data. Please run locally.");
    }
    updateMap();
}

function updateMap(){
    infoWindow.setPosition(currentLocation);
    map.setCenter(currentLocation);
}

/** This function converts an address to a LatLng, and runs the callback
*   function with it
*/
function geocode(str, callback){
    geocoder.geocode({'address': str}, function(results, status) {
        if (status === 'OK') {			
			console.log("Geocode:");
			console.log(results[0]);
			
            callback(results[0]);
        } else {
            switch(status){
            case "OVER_QUERY_LIMIT":
                alert("Geocoder failed due to query limit. Please reduce the number of queries to 5 or less.");
                break;
            default:
                alert("Geocoder failed due to: " + status);
                break;
            }
        }
    });
}

/** This function converts a LatLng to an address, and runs the callback
*   function with it
*/
function reverseGeocode(loc, callback){
    geocoder.geocode({'location': loc}, function(results, status) {
        if (status === 'OK') {
            if (results[0]) {
				console.log("Reverse Geocode:");
				console.log(results[0]);
				
                callback(results[0]);
            } else {
                alert("No results found");
            }
        } else {
            switch(status){
            case "OVER_QUERY_LIMIT":
                alert("Geocoder failed due to query limit. Please reduce the number of queries to 5 or less.");
                break;
            default:
                alert("Geocoder failed due to: " + status);
                break;
            }
        }
    });
}

function over(event){
    event.preventDefault();
}

function drop(event){
    event.preventDefault();

    var dt = event.dataTransfer;
    if (dt.items) {
        if (dt.items[0].kind == "file") {
            file = dt.items[0].getAsFile();

            document.getElementById("upload-icon").innerHTML = "&#xE226;";
            document.getElementById("upload-text").innerHTML = "File Uploaded";
            document.getElementById("compare").disabled = false;
        }
    }
}

function parseFile(){
    if(file != ""){
        readFile(file, function(e){
            var locations = parseLocations(e.target.result);
            parseResults(locations, function(results){

                var contents = document.getElementById("section-compare-contents");
                removeChildren(contents);
                updateLocations(results, contents, true);
                document.getElementById("section-compare-results").setAttribute("style", "display: block;");
            });
        });
    }
}

function readFile(file, callback){
    var fileReader = new FileReader();
    fileReader.onload = callback;
    fileReader.readAsText(file);
}

function parseLocations(text){
    var lines = text.split("\n");
    var locations = [];
    for(var i = 0; i < lines.length; i++){
        if(lines[i] != ""){
            latLongText = lines[i].split(/, /);
            locations.push({lat: parseFloat(latLongText[0]), lng: parseFloat(latLongText[1])});
        }
    }

    return locations;
}

function parseResults(locations, callback){
    var results = [];
    var waiting = locations.length;
    for(var i = 0; i < locations.length; i++){
        reverseGeocode(locations[i], function(result){
            results.push(result);
            waiting--;
            if(waiting <= 0){
                callback(results);
            }
        });
    }
}

function updateLocations(results, contents, createArticle){
    for(var i = 0; i < results.length; i++){
        updateLocation(results[i], contents, createArticle);

        //use webworker to calculate distance between currentLocation and
        if(typeof(Worker) !== "undefined"){

            try{
            var ww = new Worker("haversine.js");

            ww.addEventListener("message", function(result){
                //get the right element--ith?
                var dist = contents.getElementsByClassName("location-dist")[result.data[0]];
                var distance = result.data[1];
                dist.innerHTML = distance.toFixed(2) + "km";
            }, false);

            ww.postMessage([currentLocation.lat, currentLocation.lng,
                            results[i].geometry.location.lat(),
                            results[i].geometry.location.lng(), i]);
            } catch(err) {
                alert("Browser does not support WebWorker locally. If using Chrome, please run using the --allow-file-access-from-files flag.");
            }
        } else {
            alert("Browser does not support WebWorker locally. If using Chrome, please run using the --allow-file-access-from-files flag.");
        }
    }
}

function updateLocation(result, contents, createArticle){

    var dtLabels = ["Lat:", "Lng:", "City:", "Country:", "Dist:"];
    var ddClasses = ["location-lat", "location-lng", "location-city", "location-country", "location-dist"];

    //Iterate through each of the address_components, looking for one with type
    //street_number, route, and premise
    var premise = "";
    var street_number = "";
    var route = "";
    var city = "";
    var country = "";
    for(var i = 0; i < result.address_components.length; i++){
        var streetIndex = result.address_components[i].types.indexOf("street_number");
        if(streetIndex != -1){
            street_number = result.address_components[i].long_name;
        }

        var routeIndex = result.address_components[i].types.indexOf("route");
        if(routeIndex != -1){
            route = result.address_components[i].long_name;
        }

        var premiseIndex = result.address_components[i].types.indexOf("premise");
        if(premiseIndex != -1){
            premise = result.address_components[i].long_name;
        }

        var cityIndex = result.address_components[i].types.indexOf("locality");
        if(cityIndex != -1){
            city = result.address_components[i].long_name;
        }

        var countryIndex = result.address_components[i].types.indexOf("country");
        if(countryIndex != -1){
            country = result.address_components[i].long_name;
        }
    }
    if(street_number != "" && route != ""){
        address = street_number + " " + route;
    } else {
        address = premise;
    }


    var ddData = [result.geometry.location.lat().toFixed(2), result.geometry.location.lng().toFixed(2), city, country, "[Dist]"];

    var header = document.createElement("h4");
    header.classList.add("location-address");
    header.appendChild(document.createTextNode(address));

    var dl = document.createElement("dl");
    dl.classList.add("location");

    for(var j = 0; j < dtLabels.length; j++){

        var dt = document.createElement("dt");
        dt.appendChild(document.createTextNode(dtLabels[j]));
        dl.appendChild(dt);

        var dd = document.createElement("dd");
        dd.classList.add(ddClasses[j]);
        dd.appendChild(document.createTextNode(ddData[j]));
        dl.appendChild(dd);
    }

    if(createArticle){
        var article = document.createElement("article");
        article.classList.add("location-data", "panel-inset");
        article.appendChild(header);
        article.appendChild(dl);
        contents.appendChild(article);
    } else {
        contents.appendChild(header);
        contents.appendChild(dl);
    }
}

function removeChildren(elem){
    while(elem.hasChildNodes()){
        elem.removeChild(elem.lastChild);
    }
}
