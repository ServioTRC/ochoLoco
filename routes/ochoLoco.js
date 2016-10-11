/*******************************************************************************
 * Juego de Ocho loco
 * Implementación de servicios web.
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

//------------------------------------------------------------------------------
var express    = require('express');
var router     = express.Router();
var mongoose   = require('mongoose');
var constantes = require('../models/constantes.js');
var Juego      = require('../models/juego.js');
var Jugador    = require('../models/jugador.js');

module.exports = router;
//------------------------------------------------------------------------------
const ABORTAR  = true;

/*******************************************************************************
** BLOQUE CODIGO Convierte una función asíncrona en una promesa de ES6.
********************************************************************************/
function promisify(fun) {
  return function (/* ... */) {
	return new Promise((resolve, reject) => {
	  let args = Array.prototype.slice.call(arguments);
	  args.push((err, ...result) => {
		if (err) reject(err);
		else resolve(result);
	  });
	  fun.apply(null, args);
	});
  };
}

/******************************************************************************
**    BLOQUE CODIGO INICIO
*******************************************************************************/
router.get('/', (req, res) => {
  res.redirect('/ochoLoco/');
});
//------------------------------------------------------------------------------
router.get('/ochoLoco/', (req, res) => {
  res.render('index2.ejs');
});


/******************************************************************************
**     BLOQUE CODIGO CREAR JUEGO
**     Info:
**        nombre: nombre del juego
**        jugadores: cantidad de jugadores (2 - 5)
*******************************************************************************/
router.post('/ochoLoco/crear_juego/', (req, res) => {
	
  let resultado = { creado: false, codigo: 'invalido' };
  let nombre = req.body.nombre;
  let jugadores = req.body.jugadores;
  let juego;
  let jugador;
  let mano = [];
  let oponente = [];

  if (nombre) {
	let find = promisify(Juego.find.bind(Juego));
	find({ nombre: nombre, iniciado: false })
	.then(arg => {
	  let juegos = arg[0];
	  if (juegos.length === 0) {
		juego = new Juego({nombre: nombre, jugadores: jugadores});
		let baraja = juego.getBaraja();
		//se toman 5 cartas al azar para formar la mano.
		for (var i=0; i < 5; i++) {
			let carta = baraja[Math.floor(Math.random() * baraja.length)];
			let index = baraja.indexOf(carta);
			baraja.splice(index, 1);
			mano.push(carta);
		}
		//se elimina de la baraja las cartas que se tomaron para la mano 
		juego.setBaraja(baraja);
		oponente.push('5');
		juego.setOponentes(oponente);
		let carta = baraja[Math.floor(Math.random() * baraja.length)];
		//se seleccionara una carta diferente a 8 para iniciar el descarte
		do{
			carta  = baraja[Math.floor(Math.random() * baraja.length)];
		}
		while (carta[0] === '8');
		//se establece la carta para el descarte y se elimina de la baraja la carta
		juego.setDescarte(carta);
		var index = baraja.indexOf(carta);
		baraja.splice(index, 1);
		juego.setBaraja(baraja);
		let save = promisify(juego.save.bind(juego));
		return save();
	  } else {
		resultado.codigo = 'duplicado';
		throw ABORTAR;
	  }
	})
	.then(_ => {
	  jugador = new Jugador({
	    juego: juego._id,
	    simbolo: constantes.SIMBOLO[juego.contador]
	  });
	  //se establece la mano inicial del jugador.
	  jugador.setMano(mano);
	  let save = promisify(jugador.save.bind(juego));
	  return save();
	})
	.then(_ => {
	  req.session.id_jugador = jugador._id;
	  resultado.creado = true;
	  resultado.codigo = 'bien';
	  resultado.simbolo = jugador.simbolo;
	})
	.catch(err => {
	  if (err !== ABORTAR) {
		console.log(err);
	  }
	})
    .then(_ => res.json(resultado));
  }
});
/*********************************************************************************
**        BLOQUE CODIGO BUSQUEDA DE JUEGOS
**********************************************************************************/
router.get('/ochoLoco/juegos_existentes/', (req, res) => {
  Juego
  .find({ iniciado: false })
  .sort('nombre')
  .exec((err, juegos) => {
	if (err) {
	  console.log(err);
	}
	res.json(juegos.map(x => ({ id: x._id, nombre: x.nombre })));
  });
});

/*********************************************************************************
**        BLOQUE CODIGO UNIR A JUEGO
**        Info:
**           mano: mano del jugador a unir
**********************************************************************************/
router.put('/ochoLoco/unir_juego/', (req, res) => {
  let resultado = { unido: false, codigo: 'id_malo' };
  let idJuego = req.body.id_juego;
  let juego;
  let jugador;
  let mano = [];
  
  if (idJuego) {
    let findOne = promisify(Juego.findOne.bind(Juego));
    findOne({_id: idJuego})
    .then(arg => {
	  juego = arg[0];
	  //si el juego no ha sido iniciado al tener todos los jugadores
	  if (juego.iniciado) {
	    throw ABORTAR;
	  } else {
		//se aumenta el contador del juego para que no haya más jugadores.
		juego.contador += 1
		//se obtiene la baraja y se hace la mano del jugador
		let baraja = juego.getBaraja();
		for (var i=0; i < 5; i++) {
			var carta = baraja[Math.floor(Math.random() * baraja.length)];
			var index = baraja.indexOf(carta);
			baraja.splice(index, 1);
			mano.push(carta);
		}
		//se elimina de la baraja las cartas que se tomaron para la mano 
		juego.setBaraja(baraja);
		let oponente = juego.getOponentes();
		oponente.push('5');
		juego.setOponentes(oponente);
		//si la cantidad de jugadores ya es igual se cierra el juego
		if ((juego.contador + 1) == juego.jugadores) {
			juego.iniciado = true;
			let save = promisify(juego.save.bind(juego));
			return save();
		}else{
			let save = promisify(juego.save.bind(juego));
			return save();
		}
	  }
	})
	.then(_ => {
	  jugador = new Jugador({
	    juego: juego._id,
	    simbolo: constantes.SIMBOLO[juego.contador],
	  });
	  //se establece la mano del jugador
	  jugador.setMano(mano);
	  
	  let save = promisify(jugador.save.bind(jugador));
	  return save();
    })
	.then(_ => {
	  req.session.id_jugador = jugador._id;
	  resultado.unido = true;
	  resultado.codigo = 'bien';
	  resultado.simbolo = jugador.simbolo;
	})
	.catch(err => {
	  if (err !== ABORTAR) {
        console.log(err);
     }
	})
	.then(_ => res.json(resultado));

  } else {
	res.json(resultado);
  }
});
/*******************************************************************************
**   BLOQUE CODIGO ESTADO
********************************************************************************/
router.get('/ochoLoco/estado/', (req, res) =>{
	let resultado = {estado: 'error'};
	obtenerJuegoJugador(req, (err, juego, jugador) =>{
    //---------------------------------------------------------------------------
	//       se elimina el juego cuando termina
		function eliminarJuegoJugadores() {
          let remove = promisify(jugador.remove.bind(jugador));
		  delete req.session.id_jugar;
		  remove()
		  .then(_=>{
			let find = promisify(Jugador.find.bind(Jugador));
			return find({ juego: juego._id});
		  })
		  .then(arg =>{
			let jugadores = arg[0];
			if (jugadores.length === 0) {
              let remove = promisify(juego.remove.bind(juego));
			  return remove();
            }
		  })
		  .catch(err => console.log(err))
		  .then(_ => res.json(resultado));
        }
		//----------------------------------------------------------------------
		// se gana cuando ya no hay cartas en la mano
		function ganado(t){
			return (t.length === 0) ;
		}				
		//----------------------------------------------------------------------
		if (err) {
          console.log(err);
		  res.json(resultado);
        } else{
		  //se obtiene del juego: baraja, descarte ; jugador: mano
		  let baraja = juego.getBaraja();
		  resultado.baraja = baraja;
		  let mano = jugador.getMano();
		  resultado.jugador = mano;
		  let descarte = juego.getDescarte();
		  resultado.descarte = descarte;
		  resultado.turno = juego.turno;
		  //se espera hasta que sea tu turno y se haya iniciado el juego
		  if (!juego.iniciado) {
            resultado.estado = 'espera';
			res.json(resultado);
		  //se ve si ganaste con tu mano y manda un estado de que el juego termino
          }else if (ganado(mano)) {
            resultado.estado = 'ganaste';
			juego.estado = true;
			//se salva el estado del juego
			juego.save((err) => {
				if (err) {
                    console.log(err);
                }
			})
			//se elimina el juego y jugadores
			eliminarJuegoJugadores();
		  //se verifica si el estado del juego es true (alguien ya gano)
          }else if (juego.estado) {
            resultado.estado = 'perdiste';
			eliminarJuegoJugadores();
		 //se verifica si el turno es igual al simbolo del jugador.
          }else if (juego.turno === jugador.simbolo) {
            resultado.estado = 'tu_turno';
			res.json(resultado);
		  //seguira esperando hasta que sea tu turno
          }else{
			resultado.estado = 'espera';
			res.json(resultado);
		  }
		}
	});
});

/******************************************************************************
**   BLOQUE CODIGO INFORMACION JUEGOS
**   Info:
**       se obtiene la informacion del jugador y juego
*******************************************************************************/
function obtenerJuegoJugador(req, callback) {

  let idJugador = req.session.id_jugador;
  let juego;
  let jugador;

  if (idJugador) {
    let findOne = promisify(Jugador.findOne.bind(Jugador));
    findOne({ _id: idJugador })
    .then(arg => {
      jugador = arg[0];
      let findOne = promisify(Juego.findOne.bind(Juego));
      return findOne({ _id: jugador.juego });
    })
    .then(arg => {
      juego = arg[0];
    })
    .catch(err => console.log(err))
    .then(_ => callback(null, juego, jugador));

  } else {
    callback(new Error('La sesión no contiene el ID del jugador'));
  }
}
//------------------------------------------------------------------------------------
//   se busca por un contrincante en especifico
function contrincante(s, t) {
	if (s === t) {
        return 1;
    }else{
		switch (s) {
		case 0:
		  return 1;
		  break;	
		case 1:
		  return 2;
		  break;
		case 2:
		  return 3;
		  break;
		case 3:
		  return 4;
		  break;
		case -1:
		  return t;
		  break;			
		}
	}
}

/*******************************************************************************
**    BLOQUE CODIGO LOGICA JUEGO
**    Info:
**      La mayoria de la logica del juego
*******************************************************************************/
router.put('/ochoLoco/tirar/', (req, res) => {
	let resultado = {efectuado: false, toma: false};
	obtenerJuegoJugador(req, (err, juego, jugador) => {
    //----------------------------------------------------------------------------
		function convertirEntero(s) {
			let r = /^(0*)(\d+)$/.exec(s);
			return r ? parseInt(r[2]) : -1;
		}
	//------------------------------------------------------------------------------
	//          se guardan cambios despues de cada tiro
		function guardarCambios(descarte, carta, comodin, index) {
			//si no seleccionaron un comodin será -1
			if (comodin > 0) {
				//se seleciona el palo de acuerdo al comodin seleccionado y se pone en el descarte
                let palo = ['\u2660', '\u2665', '\u2666', '\u2663'];
				let paloComodin = palo[comodin - 1];
				var cartaComodin = ['8', paloComodin];
				//se pone la nueva carta comodin que se tiro 
				juego.setDescarte(cartaComodin);
            }else{
				//se pone la nueva carta que se tiro
				juego.setDescarte(carta);
			}
			//se obtiene la mano y se elimina la carta tirada
			let mano = jugador.getMano();
			mano.splice(index, 1);
			jugador.setMano(mano);
			let oponente = juego.getOponentes();
			let indice = convertirEntero(oponente[juego.turno - 1]);
			indice -= 1;
			oponente[juego.turno - 1] = indice;
			juego.setOponentes(oponente);
			//se le da el turno al siguiente jugador
			juego.turno = contrincante(juego.turno, juego.jugadores);
			//se guarda tanto el jugador como el juego
			jugador.save((err) =>{
				if (err) {
                    console.log(err);
                }
			});
			juego.save((err) => {
			  if (err) {
                console.log(err);
              }
			  //el tiro se ha efectuado : true y se obtiene la mano del jugador para desplegar
			  resultado.efectuado = true;
			  resultado.turno = juego.turno;
			  resultado.simbolo = jugador.simbolo;
			  resultado.oponentes = juego.getOponentes();
			  resultado.jugador = jugador.getMano();
			  res.json(resultado);
			});
        }
	//------------------------------------------------------------------------------
	// el tiro será valido si coincide con el palo, valor o sea un 8 
		function tiroValido(descarte, carta) {
            return (descarte[0] === carta[0] ||
					descarte[1] === carta[1] ||
					'8' === carta[0]);
        }
	//------------------------------------------------------------------------------
		if (err) {
            console.log(err);
			res.json(resultado);
        } else{
			//se verifica si se decdio por un comodin y si es su turno
			let decision = convertirEntero(req.body.decision);
			if (decision === 1 && juego.turno === jugador.simbolo) {
				//se obtiene la carta seleccionada
				let index = convertirEntero(req.body.tiro);
				//se obtiene el nuevo comodin
				let comodin = convertirEntero(req.body.comodin);
				//se obtiene la carta de descarte
				let descarte= juego.getDescarte();
				//se obtiene la mano
				let mano = jugador.getMano();
				//se verifica que el tiro haya sido valido y se guardan los cambios
				if (tiroValido(descarte, mano[index])) {
					guardarCambios(descarte, mano[index], comodin, index);
				}else{
					res.json(resultado);
				}
			//si se decidio tomar cartas de la baraja
			}else if(decision === 2 && juego.turno === jugador.simbolo){
				//se obtiene la mano y la baraja
				let mano = jugador.getMano();
				let baraja = juego.getBaraja();
				//se ve que la baraja aun tenga cartas
				if (baraja.length > 0 ) {
					//se toman de manera random la cartas y se agregan a la mano
					let carta = baraja[Math.floor(Math.random() * baraja.length)];
					let index = baraja.indexOf(carta);
					baraja.splice(index, 1);
					juego.setBaraja(baraja);
					mano.push(carta);
					let oponente = juego.getOponentes();
					let indice = convertirEntero(oponente[juego.turno - 1]);
					indice += 1;
					oponente[juego.turno - 1] = indice;
					juego.setOponentes(oponente);
					jugador.setMano(mano);
					jugador.save((err) =>{
						if (err) {
							console.log(err);
						}
					});
					juego.save((err) =>{
						if (err) {
							console.log(err);
						}
						//se avisa que se tomo una carta
						resultado.toma = true;
						resultado.jugador = jugador.getMano();
						resultado.descarte = juego.getDescarte();
						res.json(resultado);
					});
				//si ya no hay cartas en la baraja
				}else{
					//se cede el turno al otro jugador
					juego.turno = contrincante(juego.turno, juego.jugadores);
					juego.save((err) =>{
						//se avisa que no se tomo
						resultado.toma = false;
						resultado.jugador = jugador.getMano();
						res.json(resultado);
					});
				}
			}else{
				res.json(resultado);
			}
		}
	});
})



