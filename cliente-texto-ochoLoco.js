#!/usr/bin/env node

/*
 Juego de Ocho Loco
 Cliente de modo texto.

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

//------------------------------------------------------------------------------
var querystring   = require('querystring');
var request       = require('request');

//------------------------------------------------------------------------------
var stdin         = process.stdin;
var stdout        = process.stdout;
var servicioWeb;
const PAUSA       = 1000;          // Milisegundos entre cada petición de espera

/******************************************************************************
** BLOQUE CODIGO Creador de objetos para invocar servicios web.
********************************************************************************/
function invocadorServicioWeb(host) {
  let cookiesSesion = null;
  //----------------------------------------------------------------------------
  function obtenerCookies(res) {
    let valorSetCookies = res.headers['set-cookie'];
    if (valorSetCookies) {
      let cookies = [];
      valorSetCookies.forEach(str => cookies.push(/([^=]+=[^;]+);/.exec(str)[1]));
      cookiesSesion = cookies.join('; ');
    }
  }
  //----------------------------------------------------------------------------
  function encabezados(metodo) {
    let r = {};
    if (metodo !== 'GET') {
      r['Content-type'] = 'application/x-www-form-urlencoded';
    }
    if (cookiesSesion) {
      r['Cookie'] = cookiesSesion;
    }
    return r;
  }
  return {
    //--------------------------------------------------------------------------
    invocar: (metodo, ruta, params, callback) => {
      let opciones = {
        url: host + ruta,
        method: metodo,
        headers: encabezados(metodo)
      };
      let qs = querystring.stringify(params);
      if (metodo === 'GET' && qs !== '') {
        opciones.url +=  '?' + qs;
      } else {
        opciones.body = qs;
      }
      request(opciones, (error, res, body) => {
        if (res.statusCode !== 200) {
          errorFatal('Not OK status code (' + res.statusCode + ')');
        }
        obtenerCookies(res);
        callback(JSON.parse(body));
      });
    }
  };
}

/*******************************************************************************
**     BLOQUE CODIGO CREAR JUEGO
**     Info:
**        despliega informacion para seleccionar juego
********************************************************************************/
function crearJuego() {
  imprimirNl();
  imprimir('Indica el nombre del juego: ');
  stdin.once('data', data => {
    let name = data.toString().trim();
    if (name === '') {
      menu();
    } else {
      //se pregunta el numero de jugadores del juego y se asigna a jugadores
      leerNumero(2, 5, 'Elige el numero de jugadores del ',  data =>{
        var jugadores = data;
        //se envian los datos de nombre y cantidad de jugadores
        servicioWeb.invocar(
          'POST',
          '/ochoLoco/crear_juego/',
          {'nombre': name, 'jugadores': jugadores},
          resultado => {
            //si se creo el juego entonces se manda el simbolo de cada jugador
            if (resultado.creado) {
              jugar(resultado.simbolo);
              return;
            } else if (resultado.codigo === 'duplicado') {
              imprimirNl();
              imprimirNl('Error: Alguien más ya creó un juego con este ' +
                        'nombre: ' + name);  
            } else {
              imprimirNl();
              imprimirNl('No se proporcionó un nombre de juego válido.');
            }  
            menu();
          }
        );
      });
    }
  });
}
/********************************************************************************
 **  BLOQUE CODIGO UNIR JUEGO
 ********************************************************************************/
function unirJuego() {
  //----------------------------------------------------------------------------
  function verificarUnion(resultado) {
    if (resultado.unido) {
      jugar(resultado.simbolo);
    } else {
      imprimirNl();
      imprimirNl('No es posible unirse a ese juego.');
      menu();
    }
  }
  //----------------------------------------------------------------------------
  servicioWeb.invocar(
    'GET',
    '/ochoLoco/juegos_existentes/',
    {},
    juegos => {
      if (juegos.length === 0) {
        imprimirNl();
        imprimirNl('No hay juegos disponibles.');
        menu();
      } else {
        seleccionarJuegosDisponibles(juegos, opcion => {
          if (opcion === -1) {
            menu();
          } else {
            servicioWeb.invocar(
              'PUT',
              '/ochoLoco/unir_juego/',
              { id_juego: juegos[opcion].id },
              verificarUnion
            );
          }
        });
      }
    }
  );
}
//------------------------------------------------------------------------------
function seleccionarJuegosDisponibles(juegos, callback) {
  let total = juegos.length + 1;
  imprimirNl();
  imprimirNl('¿A qué juego deseas unirte?');
  for (let i = 1; i < total; i++) {
    imprimirNl('    (' + i + ') «' + juegos[i - 1].nombre + '»');
  }
  imprimirNl('    (' + total + ') Regresar al menú principal');
  leerNumero(1, total, 'Selecciona una opcion del ', opcion => callback(opcion === total ? -1 : opcion - 1));
}

/*****************************************************************************
**    BLOQUE CODIGO LOGICA JUEGO
**    Info:
**      Toda la logica del juego
******************************************************************************/
function jugar(symbol) {
  imprimirNl();
  imprimirNl('Un momento');
  esperarTurno(resultado => {
    //--------------------------------------------------------------------------
    function tiroEfectuado(resultado) {
      imprimirNl();
      imprimirBaraja(resultado.jugador, 'Tu Baraja', 1);
      imprimirNl();
      //-------------------------------------------------------------------------------------
      // se imprime cuantas cartas tienen los contrincantes
      for(var i = 0; i < resultado.oponentes.length; i++){
        var tmp = resultado.simbolo - 1;
        if (tmp !== i) {
          imprimirNl('El jugador ' + (i + 1) + ' tiene ' + resultado.oponentes[i] + ' cartas');
        }
      }
      
      servicioWeb.invocar(
        'GET',
        '/ochoLoco/estado/',
        {},
        resultado => {
          if (juegoTerminado(resultado.estado)) {
            menu();
          } else {          
            jugar(symbol);
          }
        }
      );
    }
    //----------------------------------------------------------------------------
    function tiroNoEfectuado() {
      imprimirNl();
      imprimirNl('ERROR: Tiro inválido.');
      jugar(symbol);
    }
    //------------------------------------------------------------------------------
    // en caso de que se haya toma de la baraja 
    function tomaEfectuada() {
      imprimirNl();
      imprimirNl('Usted ha tomado de la baraja.');
      jugar(symbol);
    }
    //-------------------------------------------------------------------------------
    // en caso de que ya no haya cartas en la baraja
    function tomaNoEfectuada() {
      imprimirNl();
      imprimirNl('Ya no hay cartas en la baraja.');
      jugar(symbol);
    }
    
    //se imprime tanto la mano del jugador como la pila de descarte
    imprimirBaraja(resultado.jugador, 'Tu Mano', 1);
    imprimirBaraja(resultado.descarte, 'Pila de Descarte', 2);
    
    //se revisa si el juego aun no ha terminado 
     if (juegoTerminado(resultado.estado)) {
      menu();
    //si es tu turno
     }else if(resultado.estado === 'tu_turno') {
      imprimirNl();
      imprimirOpciones();
      //se eligen entre tirar una carta de tu mano o tomar de la baraja
      leerNumero(1, 2, 'Selecciona una de las opciones del ', opcion =>{
        let decision = opcion;
        //si se selecciono el tirar una carta de tu mano
        if (decision === 1) {
          //se elige que carta se desea tirar
          leerNumero(0, resultado.jugador.length - 1, 'Selecciona una carta de tu mano ', baraja =>{
            let carta = baraja;
            let comodin = -1;
            //se verifica que haya sido un comodin la carta seleccionada
            if (resultado.jugador[carta][0] === '8') {
              //se imprimen las opciones de palo 
              imprimirNl();
              imprimirComodin();
              //se elige como es que sera el palo de la nueva carta que se vera en descarte
              leerNumero(1, 4, 'Selecciona la nueva carta del  ', palo =>{
                comodin = palo;
                //se envia -- tiro : carta que se decidio; decision: 1; comodin: nuevo comodin a mostrar
                servicioWeb.invocar(
                  'PUT',
                  '/ochoLoco/tirar/',
                  { tiro: carta, decision: decision, comodin: comodin},
                  resultado => {
                    //se revisa si fue o no exitoso el tiro
                    if (resultado.efectuado) {
                      tiroEfectuado(resultado);
                    } else {
                      tiroNoEfectuado();
                    }
                  }
                );
              });
            }else{
              //se envia -- tiro : carta que se decidio; decision: 1; comodin: -1
              servicioWeb.invocar(
                'PUT',
                '/ochoLoco/tirar/',
                { tiro: carta, decision: decision, comodin: comodin},
                resultado => {
                  //se revisa si fue o no exitoso el tiro
                  if (resultado.efectuado) {
                    tiroEfectuado(resultado);
                  } else {
                    tiroNoEfectuado();
                  }
                }
              );
            }
          });
        // en caso de que se decida tomar una carta de la baraja
        }else if (decision === 2) {
          let carta = -1;
          //se envia -- tiro : -1; decision: 2
          servicioWeb.invocar(
            'PUT',
            '/ochoLoco/tirar/',
            { tiro: carta, decision: decision},
            resultado => {
              //se verifica si se efectuo el tiro
              if (resultado.efectuado) {
                tiroEfectuado(resultado);
                } else {
                  //verifica si se tomo o no de la baraja
                  if (resultado.toma) {
                    tomaEfectuada();
                  }else{
                    tomaNoEfectuada();
                  }
                }
              }
          );
        }
      });
    }
  });
}
/*******************************************************************************
**  BLOQUE CODIGO ERROR
*******************************************************************************/
function errorFatal(mensaje) {
  imprimirNl('ERROR FATAL: ' + mensaje);
  process.exit(1);
}

/*******************************************************************************
**  BLOQUE CODIGO ESTADO
*******************************************************************************/
function esperarTurno(callback){
  servicioWeb.invocar(
    'GET',
    '/ochoLoco/estado',
    {},
    resultado => {
      //imprimirNl('Es el turno del jugador: ' + resultado.turno);
      if (resultado.estado === 'espera') {
        setTimeout(() => esperarTurno(callback), PAUSA);
      }else{
        imprimirNl();
        callback(resultado);
      }
    }
  );
}
/*******************************************************************************
**  BLOQUE CODIGO ESTADO TERMINADO 
*******************************************************************************/
function juegoTerminado(estado) {

  function mens(s) {
    imprimirNl();
    imprimirNl(s);
    return true;
  }

  switch (estado) {

  case 'ganaste':
    return mens('Ganaste. ¡Felicidades!');

  case 'perdiste':
    return mens('Perdiste. ¡Lástima!');

  default:
    return false;
  }
}
/*******************************************************************************
**   BLOQUE CODIGO IMPRESIONES
*******************************************************************************/
function imprimir(mens) {
  if (mens !== undefined) {
    stdout.write(mens);
  }
}
/*******************************************************************************
**  BLOQUE CODIGO IMPRESION COMODIN
**  Info:
**     se selecciona entre espada, trebol, corazon, diamante para la nueva carta
*******************************************************************************/
function imprimirComodin() {
  imprimirNl('Selecciona una opción para tu comodin: ');
  imprimirNl('(1) \u2660');
  imprimirNl('(2) \u2665');
  imprimirNl('(3) \u2666');
  imprimirNl('(4) \u2663');
  imprimirNl();
}
/*******************************************************************************
**  BLOQUE CODIGO OPCIONES
**  Info:
**     Son las opciones que se dan al inicio del juego para tomar o tirar
*******************************************************************************/
function imprimirOpciones() {
  imprimirNl('(1) Elegir una carta de tu mano');
  imprimirNl('(2) Tomar una carta de la baraja');
  imprimirNl();
}
/*******************************************************************************
**  BLOQUE CODIGO MENU
*******************************************************************************/
function imprimirMenu() {
  imprimirNl();
  imprimirNl('================');
  imprimirNl(' MENÚ PRINCIPAL');
  imprimirNl('================');
  imprimirNl('(1) Crear un nuevo juego');
  imprimirNl('(2) Unirse a un juego existente');
  imprimirNl('(3) Salir');
  imprimirNl();
}
/*******************************************************************************
**  BLOQUE CODIGO NUEVA LINEA
*******************************************************************************/
function imprimirNl(mens) {
  if (mens !== undefined) {
    stdout.write(mens);
  }
  stdout.write('\n');
}

/*******************************************************************************
**  BLOQUE CODIGO IMPRESION BARAJA
**  Info:
**    Opcion 1 - imprimir mano
**             - si es comodin se imprime que el 8 es comodin
**    Opcion 2 - imprimir carta descarte
*******************************************************************************/
function imprimirBaraja(t, mensaje, opcion) {
  if (opcion === 1) {
    imprimirNl('---' + mensaje + '---');
    for (var i=0; i < t.length; i++) {
      if (t[i][0] === '8') {
        imprimirNl('Carta ' + i + ': ' + t[i][0] + '  ' + t[i][1] + ' (comodin)');
      }else{
        imprimirNl('Carta ' + i + ': ' + t[i][0] + '  ' + t[i][1]);
      }
    }
  }else{
      imprimirNl('---' + mensaje + '---');
      imprimirNl('Carta : ' + t[0] + '  ' + t[1]);
  }
}

/*******************************************************************************
**  BLOQUE CODIGO LECTURA DE SELECCION
*******************************************************************************/
function leerNumero(inicio, fin, mensaje, callback) {
  imprimir(mensaje + inicio + ' al ' + fin + ': ');
  stdin.once('data', data => {
    let numeroValido = false;
    let num;
    data = data.toString().trim();
    if (/^\d+$/.test(data)) {
      num = parseInt(data);
      if (inicio <= num && num <= fin) {
        numeroValido = true;
      }
    }
    if (numeroValido) {
      callback(num);
    } else {
      leerNumero(inicio, fin, mensaje, callback);
    }
  });
}
/*******************************************************************************
**  BLOQUE CODIGO MENU
*******************************************************************************/
function menu() {
  imprimirMenu();
  leerNumero(1, 3, 'Selecciona una opcion del ', opcion => {
    switch (opcion) {
    case 1:
      crearJuego();
      break;
    case 2:
      unirJuego();
      break;
    case 3:
      process.exit(0);
    }});
}
/*******************************************************************************
**  BLOQUE CODIGO TITULO
*******************************************************************************/
function titulo() {
  imprimirNl('Juego de Ocho Loco');
  imprimirNl('Karla Aquino, Roberto Garcia y Salvador Pineda, ITESM CEM.');
}

/********************************************************************************
**  BLOQUE CODIGO INICIO
*********************************************************************************/
titulo();
imprimirNl();

if (process.argv.length !== 3) {
  imprimirNl();
  imprimirNl('Se debe indicar: http://<nombre de host>:<puerto>');
  process.exit(0);

} else {
  servicioWeb = invocadorServicioWeb(process.argv[2]);
  menu();
}