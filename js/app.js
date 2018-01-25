// global variables
var map; var infoWindow; var bounds;

// google maps init function
function initMap() {
    var dehradun = {
		// latitude and longitude of dehradun city in india
        lat: 30.3164945,
        lng: 78.03219179999999
    };
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
		// initaial zoom at a particular location
        center: dehradun,
        mapTypeControl: false
    });

    infoWindow = new google.maps.InfoWindow();

    bounds = new google.maps.LatLngBounds();
   
    ko.applyBindings(new ViewModel());
}

// handle map error when map doesn't load
function mapError() {
    alert('oops!! Google map in loading, please check your internet connection.');
}

/* Location Model */ 
var LocationMarker = function(data) {
    var self = this;

    self.title = data.title;
    self.position = data.location;
    self.street = '',
    self.city = '';
    

    self.visible = ko.observable(true);

    // This will be our default marker icon(red).
    var defaultIcon = makeMarkerIcon('ff0000');
    // Create a highlighted marker color for when the user mouses over the marker.
    var highlightedIcon = makeMarkerIcon('db9111');
    // clienr id and secret of foursquare 
    var clientID = 'SJZF1EBU50IATBRLTGTTITKZEFBP4ULSS1ATTA5X2XUGUF0J';
    var clientSecret = 'FMKH5S1QWKW1KZCH2RK5O1N2NI1RJRO4I1BMW0KBZQHRVI3V';
    // get JSON request of foursquare data
    var reqURL = 'https://api.foursquare.com/v2/venues/search?ll=' + this.position.lat + ',' + this.position.lng + '&client_id=' + clientID + '&client_secret=' + clientSecret + '&v=20160118' + '&query=' + this.title;

    $.getJSON(reqURL).done(function(data) {
		var results = data.response.venues[0];
        self.street = results.location.formattedAddress[0] ? results.location.formattedAddress[0]: 'N/A';
        self.city = results.location.formattedAddress[1] ? results.location.formattedAddress[1]: 'N/A';
        self.phone = results.contact.formattedPhone ? results.contact.formattedPhone : 'N/A';
    }).fail(function() {
        alert("Foursquare isn't responding, Please check your internet connection");
    });

    // Create a marker for each location
    this.marker = new google.maps.Marker({
        position: this.position,
        title: this.title,
        animation: google.maps.Animation.DROP,
        icon: defaultIcon
    });    
    // create a filter
    self.filterMarkers = ko.computed(function () {
        
        if(self.visible() === true) {
            self.marker.setMap(map);
            bounds.extend(self.marker.position);
            map.fitBounds(bounds);
        } else {
            self.marker.setMap(null);
        }
    });
    
    // Create an onclick even to open an indowindow at each marker
    this.marker.addListener('click', function() {
        populateInfoWindow(this, self.street, self.city, infoWindow);
        toggleBounce(this);
        map.panTo(this.getPosition());
    });

    // Two event listeners - one for mouseover, one for mouseout,
    // to change the colors back and forth.
    this.marker.addListener('mouseover', function() {
        this.setIcon(highlightedIcon);
    });
    this.marker.addListener('mouseout', function() {
        this.setIcon(defaultIcon);
    });
    // creates bounce effect when marker got clicked
    this.bounce = function(place) {
		google.maps.event.trigger(self.marker, 'click');
	};

    // show item info when marker got clicked
    this.show = function(location) {
        google.maps.event.trigger(self.marker, 'click');
    };

    
};

/* View Model function (octopus) */
var ViewModel = function() {
    var self = this;

    this.searchItem = ko.observable('');

    this.mapList = ko.observableArray([]);

    // location marker for each location
    locations.forEach(function(location) {
        self.mapList.push( new LocationMarker(location) );
    });

    // locations viewed on map
    this.locationList = ko.computed(function() {
        var searchFilter = self.searchItem().toLowerCase();
        if (searchFilter) {
            return ko.utils.arrayFilter(self.mapList(), function(location) {
                var str = location.title.toLowerCase();
                var result = str.includes(searchFilter);
                location.visible(result);
				return result;
			});
        }
        self.mapList().forEach(function(location) {
            location.visible(true);
        });
        return self.mapList();
    }, self);
};

// This function populates the infowindow when the marker is clicked.
function populateInfoWindow(marker, street, city, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        // give time to street view to load
        infowindow.setContent('');
        infowindow.marker = marker;
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });
        var streetViewService = new google.maps.StreetViewService();
        var radius = 50;

        var windowContent = '<h4>' + marker.title + '</h4>' + 
            '<p>' + street + "<br>" + city + "</p>";

        // compute the position of the streetview image and then display
        var getStreetView = function (data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                var nearStreetViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(
                    nearStreetViewLocation, marker.position);
                infowindow.setContent(windowContent + '<div id="pano"></div>');
                var panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 20
                    }
                };
                var panorama = new google.maps.StreetViewPanorama(
                    document.getElementById('pano'), panoramaOptions);
            } else {
                infowindow.setContent(windowContent + '<div style="color: red">sorry! street is not available</div>');
            }
        };
        // Use streetview service to get the closest streetview image within 50 meters of the markers position.
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        // Open the infowindow on a particular marker
        infowindow.open(map, marker);
    }
}
//create marker bounce 
function toggleBounce(marker) {
  if (marker.getAnimation() !== null) {
    marker.setAnimation(null);
  } else {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {
        marker.setAnimation(null);
    }, 1500);
  }
}

// This function takes in a COLOR, and then creates a new marker
// icon of that color of the particular size as mention in the function.
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
        '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21, 34));
    return markerImage;
}
