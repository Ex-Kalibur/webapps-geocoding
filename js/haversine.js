self.addEventListener('message', function(e) {
    self.postMessage([e.data[4], haversine(degToRad(e.data[0]),
                                           degToRad(e.data[1]),
                                           degToRad(e.data[2]),
                                           degToRad(e.data[3]))]);
}, false);

function haversine(loc1Lat, loc1Lng, loc2Lat, loc2Lng){
    var R = 6372.8;
    var dLat = loc2Lat - loc1Lat;
    var dLng = loc2Lng - loc1Lng;

    var a = Math.sin(dLat / 2) * Math.sin(dLat /2) + Math.sin(dLng / 2) * Math.sin(dLng /2) * Math.cos(loc1Lat) * Math.cos(loc2Lat);
    var c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
}

function degToRad(deg){
    return deg/180.0 * Math.PI;
}
