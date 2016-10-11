/*******************************************************************************
 * Juego de Ocho Loco
 * Definición del modelo Juego.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 ******************************************************************************/

'use strict';

var mongoose = require('mongoose');
var constantes = require('./constantes.js');

//-------------------------------------------------------------------------------
var esquemaJuego = mongoose.Schema({
  nombre:   String,
  iniciado: { type: Boolean,
              default: false },
  //cantidad de jugadores
  jugadores: Number,
  //cuenta de jugadores que han ingresado al juego
  contador: { type: Number,
              default: 0},
  turno:    { type: Number,
              default: constantes.SIMBOLO[0] },
  //carta en la baraja de descarte
  descarte:  {type: String,
              default: []},
  baraja:  { type: String,
              default: JSON.stringify(constantes.BARAJA_INICIO) },
  //estado de terminado el juego 
  estado:   { type: Boolean,
              default: false},
  oponentes: { type: Array}
});

//-------------------------------------------------------------------------------
esquemaJuego.methods.getBaraja = function () {
  return JSON.parse(this.baraja);
};

//-------------------------------------------------------------------------------
esquemaJuego.methods.setBaraja = function (baraja) {
  this.baraja = JSON.stringify(baraja);
};

//-------------------------------------------------------------------------------
//se obtiene la carta de descarte
esquemaJuego.methods.getDescarte = function () {
  return JSON.parse(this.descarte);
};

//-------------------------------------------------------------------------------
//se establece la carta de descarte
esquemaJuego.methods.setDescarte = function (descarte) {
  this.descarte = JSON.stringify(descarte);
};

//------------------------------------------------------------------------------
esquemaJuego.methods.getOponentes = function () {
  return JSON.parse(this.oponentes);
};

//-------------------------------------------------------------------------------
esquemaJuego.methods.setOponentes = function (oponentes) {
  this.oponentes = JSON.stringify(oponentes);
};

//-------------------------------------------------------------------------------
module.exports = mongoose.model('Juego', esquemaJuego);
