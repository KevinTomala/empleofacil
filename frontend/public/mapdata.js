var simplemaps_countrymap_mapdata={
  main_settings: {
    //General settings
		width: "responsive", //or 'responsive'
    background_color: "#FFFFFF",
    background_transparent: "yes",
    border_color: "#ffffff",
    pop_ups: "detect",
    
		//State defaults
		state_description: "State description",
    state_color: "#88A4BC",
    state_hover_color: "#3B729F",
    state_url: "",
    border_size: 1.5,
    all_states_inactive: "no",
    all_states_zoomable: "yes",
    
		//Location defaults
		location_description: "Location description",
    location_url: "",
    location_color: "#FF0067",
    location_opacity: 0.8,
    location_hover_opacity: 1,
    location_size: 25,
    location_type: "square",
    location_image_source: "frog.png",
    location_border_color: "#FFFFFF",
    location_border: 2,
    location_hover_border: 2.5,
    all_locations_inactive: "no",
    all_locations_hidden: "no",
    
		//Label defaults
		label_color: "#ffffff",
    label_hover_color: "#ffffff",
    label_size: 16,
    label_font: "Arial",
    label_display: "auto",
    label_scale: "yes",
    hide_labels: "no",
    hide_eastern_labels: "no",
   
		//Zoom settings
		zoom: "yes",
    manual_zoom: "yes",
    back_image: "no",
    initial_back: "no",
    initial_zoom: "-1",
    initial_zoom_solo: "no",
    region_opacity: 1,
    region_hover_opacity: 0.6,
    zoom_out_incrementally: "yes",
    zoom_percentage: 0.99,
    zoom_time: 0.5,
    
		//Popup settings
		popup_color: "white",
    popup_opacity: 0.9,
    popup_shadow: 1,
    popup_corners: 5,
    popup_font: "12px/1.5 Verdana, Arial, Helvetica, sans-serif",
    popup_nocss: "no",
    
		//Advanced settings
		div: "map",
    auto_load: "yes",
    url_new_tab: "no",
    images_directory: "default",
    fade_time: 0.1,
    link_text: "View Website"
  },
  state_specific: {
    ECA: {
      name: "Azuay",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECB: {
      name: "Bolivar",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECC: {
      name: "Carchi",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECD: {
      name: "Orellana",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECE: {
      name: "Esmeraldas",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECF: {
      name: "Cañar",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECG: {
      name: "Guayas",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECH: {
      name: "Chimborazo",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECI: {
      name: "Imbabura",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECL: {
      name: "Loja",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECM: {
      name: "Manabi",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECN: {
      name: "Napo",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECO: {
      name: "El Oro",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECP: {
      name: "Pichincha",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECR: {
      name: "Los Rios",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECS: {
      name: "Morona Santiago",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECSD: {
      name: "Santo Domingo de los Tsáchilas",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECSE: {
      name: "Santa Elena",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECT: {
      name: "Tungurahua",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECU: {
      name: "Sucumbios",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECW: {
      name: "Galápagos",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECX: {
      name: "Cotopaxi",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECY: {
      name: "Pastaza",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    },
    ECZ: {
      name: "Zamora Chinchipe",
      description: "default",
      color: "default",
      hover_color: "default",
      url: "default"
    }
  },
  locations: {
    "0": {
      name: "Quito",
      lat: "-0.194568",
      lng: "-78.493005"
    }
  },
  labels: {
    ECA: {
      name: "Azuay",
      parent_id: "ECA"
    },
    ECB: {
      name: "Bolivar",
      parent_id: "ECB"
    },
    ECC: {
      name: "Carchi",
      parent_id: "ECC"
    },
    ECD: {
      name: "Orellana",
      parent_id: "ECD"
    },
    ECE: {
      name: "Esmeraldas",
      parent_id: "ECE"
    },
    ECF: {
      name: "Cañar",
      parent_id: "ECF"
    },
    ECG: {
      name: "Guayas",
      parent_id: "ECG"
    },
    ECH: {
      name: "Chimborazo",
      parent_id: "ECH"
    },
    ECI: {
      name: "Imbabura",
      parent_id: "ECI"
    },
    ECL: {
      name: "Loja",
      parent_id: "ECL"
    },
    ECM: {
      name: "Manabi",
      parent_id: "ECM"
    },
    ECN: {
      name: "Napo",
      parent_id: "ECN"
    },
    ECO: {
      name: "El Oro",
      parent_id: "ECO"
    },
    ECP: {
      name: "Pichincha",
      parent_id: "ECP"
    },
    ECR: {
      name: "Los Rios",
      parent_id: "ECR"
    },
    ECS: {
      name: "Morona Santiago",
      parent_id: "ECS"
    },
    ECSD: {
      name: "Santo Domingo de los Tsáchilas",
      parent_id: "ECSD"
    },
    ECSE: {
      name: "Santa Elena",
      parent_id: "ECSE"
    },
    ECT: {
      name: "Tungurahua",
      parent_id: "ECT"
    },
    ECU: {
      name: "Sucumbios",
      parent_id: "ECU"
    },
    ECW: {
      name: "Galápagos",
      parent_id: "ECW"
    },
    ECX: {
      name: "Cotopaxi",
      parent_id: "ECX"
    },
    ECY: {
      name: "Pastaza",
      parent_id: "ECY"
    },
    ECZ: {
      name: "Zamora Chinchipe",
      parent_id: "ECZ"
    }
  }
};