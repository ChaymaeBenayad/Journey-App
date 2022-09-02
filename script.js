"use strict";

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector(".form");
const containerplaces = document.querySelector(".places");
const inputPlace = document.querySelector(".form-input-place");
const inputCity = document.querySelector(".form-input-city");
const inputCountry = document.querySelector(".form-input-country");
const inputDate = document.querySelector(".form-input-date");
const inputDuration = document.querySelector(".form-input-duration");
const inputDescription = document.querySelector(".form-input-description");
const errorContainer = document.querySelector(".error");
const modal = document.querySelector(".modal");
const overlay = document.querySelector(".overlay");
const btnCloseModal = document.querySelector(".btn--close-modal");
const yesBtn = document.querySelector(".yes-btn");
const cancelBtn = document.querySelector(".cancel-btn");
const apiKey =
  "AAPK5fe32372c72e4d2d99a19f0b9eb99097Xx5NoKBs-oKmU-RCf2OJRQ5SbsX5oE7-rrsqSkVf_Tr_Eh5DeudXMHb0xLvCDorw";

class Place {
  id = (Date.now() + "").slice(-10);

  constructor(coords, name, city, country, date, duration, description) {
    this.coords = coords; //[lat,lng]
    this.name = name;
    this.city = city;
    this.country = country;
    this.date = date;
    this.duration = duration; //in hours
    this.description = description;
    this._setTitle();
  }

  _setTitle() {
    const d = new Date(`${this.date}`);
    this.title = `${this.name} visited on ${
      months[d.getMonth()]
    } ${d.getDate()}, ${d.getFullYear()}`;
  }
}

class App {
  //private fields
  #map;
  #mapEvent;
  #places = [];

  constructor() {
    //get user's position
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();

    //attach event handlers
    form.addEventListener("submit", this._newplace.bind(this));
    containerplaces.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("We could not get your current position!");
        }
      );
    }
  }

  _loadMap(position) {
    //Get current location coordinates
    const { latitude } = position.coords; //latitude = position.coords.latitude
    const { longitude } = position.coords; //longitude = position.coords.longitude
    const coords = [latitude, longitude];

    //Create a map on current location
    /*(leaflet namespace)L.map('id of HTML elem where we want 
  to display our map').setView([latitude, longitude],zoomLevel)*/
    this.#map = L.map("map").setView(coords, 13);

    //add tileLayers to the map
    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Include the search box
    const searchControl = new L.esri.Geocoding.geosearch({
      position: "topright",
      placeholder: "Enter an address or a place",
      useMapBounds: false,
      providers: [
        L.esri.Geocoding.arcgisOnlineProvider({
          apikey: apiKey, // replace with your api key - https://developers.arcgis.com
        }),
      ],
    }).addTo(this.#map);

    const results = new L.LayerGroup().addTo(this.#map);

    searchControl.on("results", function (data) {
      results.clearLayers();
      for (let i = data.results.length - 1; i >= 0; i--) {
        results.addLayer(L.marker(data.results[i].latlng));
      }
    });

    //Show the form whenever the user clicks on the map
    this.#map.on("click", this._showForm.bind(this));

    //render markers of local storage data
    this.#places.forEach((place) => this._renderplaceMarker(place));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    const { lat, lng } = this.#mapEvent.latlng;
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

    form.classList.remove("hidden");

    //get place data from latitude & longitude
    fetch(url)
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        const namePlace = data.display_name.split(",")[0] ?? "";
        const city = data.address.city ?? "";
        const country = data.address.country ?? "";

        //set input values
        inputPlace.value = namePlace;
        inputCity.value = city;
        inputCountry.value = country;
      })
      .catch((err) => {
        console.error(err);
      });
  }

  _hideForm() {
    //clear inputs
    inputPlace.value =
      inputCity.value =
      inputCountry.value =
      inputDate.value =
      inputDuration.value =
      inputDescription.value =
        "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _newplace(e) {
    e.preventDefault();

    //helper functions
    const checkEmpty = (...inputs) =>
      inputs.every((inputVal) => inputVal !== "");

    const invalidInput = (inputs) => {
      if (inputs.length > 1) {
        inputs
          .filter((empty) => empty.value === "")
          .forEach((input) => {
            input.classList.add("invalid-input");
            setTimeout(function () {
              input.classList.remove("invalid-input");
            }, 4000);
          });
      }
      if (inputs.length === 1) {
        inputs[0].classList.add("invalid-input");
        setTimeout(() => inputs[0].classList.remove("invalid-input"), 4000);
      }
    };

    //get data from form
    let placeName = inputPlace.value;
    let city = inputCity.value;
    let country = inputCountry.value;
    const date = inputDate.value;
    const duration = +inputDuration.value;
    const description = inputDescription.value;
    const { lat, lng } = this.#mapEvent?.latlng ?? "";
    const coords = [lat, lng];
    let place;
    const regex1 = new RegExp("^[a-zA-ZÀ-Ÿ0-9-.',: ]*$");
    const regex2 = new RegExp("^[a-zA-ZÀ-Ÿ-.',: ]*$");
    let errorSet = new Set();

    //check data
    const validateForm = function () {
      if (!checkEmpty(placeName, city, country, date, duration, description)) {
        errorSet.add("Please fill in all the fields!");
        invalidInput([
          inputPlace,
          inputCity,
          inputCountry,
          inputDate,
          inputDuration,
          inputDescription,
        ]);
        return false;
      }

      if (!regex1.test(placeName)) {
        errorSet.add("Please enter a valid place name!");
        invalidInput([inputPlace]);
        return false;
      }

      if (!regex2.test(city)) {
        errorSet.add("Please enter a valid city name!");
        return false;
      }

      if (!regex2.test(country)) {
        errorSet.add("Please enter a valid country name!");
        return false;
      }

      if (duration < 0) {
        errorSet.add("The duration must be a positive number!");
        invalidInput([inputDuration]);
        return false;
      }
      return true;
    };

    if (!validateForm()) {
      errorContainer.classList.remove("error-hidden");

      const errorMsg = `${errorSet.values().next().value}`;
      errorContainer.insertAdjacentHTML("afterbegin", errorMsg);
      setTimeout(() => {
        errorContainer.classList.add("error-hidden");
        errorContainer.innerHTML = "";
      }, 4000);
    }

    if (validateForm()) {
      place = new Place(
        coords,
        placeName,
        city,
        country,
        date,
        duration,
        description
      );

      //add new object to place array
      this.#places.push(place);

      //render place as marker on map
      this._renderplaceMarker(place);

      //render place on list
      this._renderplace(place);

      //hide form + clear input fields
      this._hideForm();

      //set local storage to all places
      this._setLocalStorage();
    }
  }

  _renderplaceMarker(place) {
    L.marker(place.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: "popup",
        })
      )
      .setPopupContent(`${place.title}`)
      .openPopup();
  }

  _renderplace(place) {
    const spentTime = (numberOfHours) => {
      const days = Math.floor(numberOfHours / 24);
      const remainder = numberOfHours % 24;
      const hours = Math.floor(remainder);
      if (numberOfHours === 24) return `1 Day`;
      if (numberOfHours < 24) return `${hours} Hours`;
      if (days === 1 && remainder === 1) return `${days} Day ${hours} Hour`;
      if (days === 1 && numberOfHours > 24) return `${days} Day ${hours} Hours`;
      if (remainder === 0) return `${days} Days`;
      if (remainder === 1) return `${days} Days ${hours} Hour`;
      return `${days} Days ${hours} Hours`;
    };

    const html = `
    <li class="place" data-id="${place.id}">
      <button class="btn btn-edit">
       <i class="fa-solid fa-pen-to-square"></i>
      </button>
      <button class="btn btn-delete">
        <i class="fa-solid fa-trash"></i>
      </button>
      <h2 class="place-title">${place.title}</h2>
      <div class="place-details">
        <i class="fa-solid fa-location-dot fa-xl"></i>
        <span class="place-value">${place.name}</span>
      </div>
      <div class="place-details">
        <i class="fa-solid fa-city fa-xl"></i>
        <span class="place-value">${place.city}</span>
      </div>
      <div class="place-details">
        <i class="fa-solid fa-clock fa-xl"></i>
        <span class="place-value">${spentTime(place.duration)}</span>
      </div>
      <div class="place-details">
        <i class="fa-solid fa-earth-americas fa-xl"></i>
        <span class="place-value">${place.country}</span>
      </div>
      <div class="place-description">
        <i class="fa-solid fa-comment fa-xl"></i>
        <span class="place-value place-description"
          >${place.description}</span
        >
      </div>
    </li>
    `;

    form.insertAdjacentHTML("afterend", html);

    //edit place
    const editBtn = document.querySelector(".btn-edit");
    editBtn.addEventListener("click", this._editPlace.bind(this));

    //delete place
    const deleteBtn = document.querySelector(".btn-delete");
    deleteBtn.addEventListener("click", this._confirmDelete.bind(this));
  }

  _findPlace(e) {
    const placeElm = e.target.closest(".place");

    if (!placeElm) return;

    const place = this.#places.find(
      (place) => place.id === placeElm.dataset.id
    );
    return place;
  }

  _setFormData(place) {
    inputPlace.value = place.name;
    inputCity.value = place.city;
    inputCountry.value = place.country;
    inputDate.value = place.date;
    inputDuration.value = place.duration;
    inputDescription.value = place.description;
  }

  _deletePlace(place) {
    //remove place element
    const placeInfo = document.querySelector(`[data-id = "${place.id}"`);
    placeInfo.remove();
    //containerplaces.removeChild(placeInfo);

    //remove place marker
    const marker = L.marker(place.coords);
    this.#map.removeLayer(marker);

    //remove place from local storage
    const data = JSON.parse(localStorage.getItem("places"));
    const filtered = data.filter((item) => item.id !== place.id);
    localStorage.setItem("places", JSON.stringify(filtered));

    //refresh page
    document.location.reload();
  }

  _confirmDelete(e) {
    e.preventDefault();
    const place = this._findPlace(e);

    //open modal
    modal.classList.remove("hidden");
    overlay.classList.remove("hidden");

    const closeModal = function () {
      modal.classList.add("hidden");
      overlay.classList.add("hidden");
    };

    //event handlers
    yesBtn.addEventListener("click", () => this._deletePlace(place));
    cancelBtn.addEventListener("click", closeModal);
    btnCloseModal.addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);
  }

  _editPlace(e) {
    const place = this._findPlace(e);

    //show form + set place data
    form.classList.remove("hidden");
    this._setFormData(place);

    //remove the place that we want to modify
    form.addEventListener("submit", () => this._deletePlace(place));
  }

  _moveToPopup(e) {
    const placeElm = e.target.closest(".place");

    if (!placeElm) return;

    const place = this.#places.find(
      (place) => place.id === placeElm.dataset.id
    );

    this.#map.setView(place.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("places", JSON.stringify(this.#places));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("places"));

    if (!data) return;

    this.#places = data;

    this.#places.forEach((place) => this._renderplace(place));
  }
}

const app = new App();
