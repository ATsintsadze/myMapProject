'use strict';

class Postman {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, recipient, delivery) {
    // this.date = date;
    // this.id = id;
    this.coords = coords;
    this.recipient = recipient;
    this.delivery = delivery;
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Parcel extends Postman {
  type = 'parcel';
  constructor(coords, recipient, delivery, weight) {
    super(coords, recipient, delivery);
    this.weight = weight;
    this._setDescription();
  }
}
class Letter extends Postman {
  type = 'letter';
  constructor(coords, recipient, delivery, quantity) {
    super(coords, recipient, delivery);
    this.quantity = quantity;
    this._setDescription();
  }
}
// app architecture

const form = document.querySelector('.form');
const containerPostmain = document.querySelector('.postmain');
const inputType = document.querySelector('.form_input-type');
const inputName = document.querySelector('.form_input-name');
const inputTime = document.querySelector('.form_input-time');
const inputWeight = document.querySelector('.form_input-weight');
const inputQuantity = document.querySelector('.form_input-quantity');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #postmans = [];

  constructor() {
    // get users position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // attach evend handlers
    form.addEventListener('submit', this._newPost.bind(this));
    inputType.addEventListener('change', this._toggleLetterField);
    containerPostmain.addEventListener('click', this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Sorry, could not get your position');
        }
      );
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));

    this.#postmans.forEach(post => {
      this._renderPostmanMarker(post);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputName.focus();
  }

  _hideForm() {
    // empty inputs
    inputName.value =
      inputTime.value =
      inputWeight.value =
      inputQuantity.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleLetterField() {
    inputQuantity.closest('.form_row').classList.toggle('form_row--hidden');
    inputWeight.closest('.form_row').classList.toggle('form_row--hidden');
  }
  _newPost(e) {
    e.preventDefault();

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // get data from form
    const type = inputType.value;
    const name = inputName.value;
    const time = inputTime.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let postman;

    // if parcel - create parcel object
    if (type === 'parcel') {
      const weight = +inputWeight.value;
      // check if data is valid
      if (!isNaN(name) || !Number.isFinite(weight) || !allPositive(weight))
        return alert('Please check inputs and write valid information');

      postman = new Parcel([lat, lng], name, time, weight);
    }
    // if letter - create letter object
    if (type === 'letter') {
      const quantity = +inputQuantity.value;
      if (!isNaN(name) || !Number.isFinite(quantity) || !allPositive(quantity))
        return alert('Please check inputs and write valid information');
      postman = new Letter([lat, lng], name, time, quantity);
    }
    // add new object to POSTMANS array
    this.#postmans.push(postman);

    // rendel delivery on map as marker
    this._renderPostmanMarker(postman);
    // render delivery on list
    this._renderPostman(postman);
    // hide form and clear input fields
    this._hideForm();

    // set local storage
    this._setLocalStorage();
  }
  _renderPostmanMarker(postman) {
    L.marker(postman.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${postman.type}-popup`,
        })
      )
      .setPopupContent(
        `${postman.type === 'parcel' ? '🛄 Delivered' : '📬 Delivered'} ${
          postman.description
        }`
      )
      .openPopup();
  }

  _renderPostman(postman) {
    let html = `
    <li class="postmains postmain--${postman.type}" data-id="${postman.id}">
         <h2 class="postmain__title">${postman.description}</h2>
           <div class="postmain__details">
           <span class="postmain__icon">🙍‍♂️</span>
          <span class="postmain__value">${postman.recipient}</span>

      </div>
      <div class="postmain__details">
          <span class="postmain__icon">⏱</span>
          <span class="postmain__value">${postman.delivery}</span>
      </div>
      `;

    if (postman.type === 'parcel')
      html += `
    <div class="postmain__details">
      <span class="postmain__icon">📦</span>
      <span class="postmain__value">Weight: ${postman.weight}kg</span>
    </div>
    </li>
      `;
    if (postman.type === 'letter')
      html += `
      <div class="postmain__details">
      <span class="postmain__icon">✉️</span>
      <span class="postmain__value">Quantity: ${postman.quantity}</span>
    </div>

      `;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const postEl = e.target.closest('.postmains');

    if (!postEl) return;

    const postmain = this.#postmans.find(post => post.id === postEl.dataset.id);

    this.#map.setView(postmain.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('postmans', JSON.stringify(this.#postmans));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('postmans'));

    if (!data) return;

    this.#postmans = data;
    this.#postmans.forEach(post => {
      this._renderPostman(post);
    });
  }

  reset() {
    localStorage.removeItem('postmans');
    location.reload();
  }
}

const app = new App();
