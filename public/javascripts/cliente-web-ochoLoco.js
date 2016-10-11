/*
 Juego de Ocho Loco
 Cliente web.

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

const PAUSA = 1000;  // Número de milisegundos entre cada petición de espera

//------------------------------------------------------------------------------
$(document).ready(() => {

  //----------------------------------------------------------------------------
  $('.regresar_al_menu').click(menuPrincipal);

  //----------------------------------------------------------------------------
  $('#boton_continuar_crear_juego').click(continuarCrearJuego);
  
  //----------------------------------------------------------------------------
  $('#boton_tomar_baraja').click(tomarBaraja);

  //----------------------------------------------------------------------------
  $('#boton_crear_juego').click(() => {
    $('div').hide();
    $('#nombre_del_juego').val('');
    $('#seccion_solicitar_nombre').show();
  });

  //----------------------------------------------------------------------------
  $('#boton_continuar_unir_juego').click(() => {
    var id_juego = $('#lista_juego').val();
    $.ajax({
      url: '/ochoLoco/unir_juego/',
      type: 'PUT',
      dataType: 'json',
      data: { id_juego: id_juego },
      error: errorConexion,
      success: resultado => {
        if (resultado.unido) {
          $('div').hide();
          $('#boton_mensajes_regresar_al_menu').hide();
          $('#seccion_mensajes').show();
          $('#seccion_tablero').show();
          $('#mensaje_1').html('Por favor espera tu turno.');
          esperaTurno();
        }
      }
    });
  });

  //----------------------------------------------------------------------------
  $('#boton_unir_juego').click(() => {
    $('div').hide();
    $.ajax({
      url: '/ochoLoco/juegos_existentes/',
      type: 'GET',
      dataType: 'json',
      error: errorConexion,
      success: resultado => {
        if (resultado.length === 0) {
          $('#seccion_sin_juegos').show();
        } else {
          var r = resultado.map(x => {
            return '<option value="' + x.id + '">' +
              escaparHtml(x.nombre) + '</option>';
          });
          $('#lista_juego').html(r.join(''));
          $('#seccion_lista_juegos').show();
        }
      }
    });
  });

  //----------------------------------------------------------------------------
  $('#form_lista_juegos').submit(() => {
    return false; // Se requiere para evitar que la forma haga un "submit".
  });

  //----------------------------------------------------------------------------
  $('#form_nombre_del_juego').submit(continuarCrearJuego);

  //----------------------------------------------------------------------------
  function activar(resultado) {
    $("#seccion_tablero img").remove();
    var arreglo = [];
    for (var i = 0; i < resultado.jugador.length; i++) {
      var strPalo = cambiarArreglo(resultado.jugador[i][1]);
      var str = '/images/'+resultado.jugador[i][0]+strPalo+'.png';
      arreglo.push(str);
    }
    var $div = $('#mano');
    
    var descarte = '/images/'+resultado.descarte[0]+cambiarArreglo(resultado.descarte[1])+'.png';
    
    
    $("<img />").attr({src: descarte,
                      class: "img-responsive",
                      width: '100',
                      height: '100'}).appendTo("#descarte");
    
    
    $.each(arreglo, function(i, val){
      $("<img />").attr({src: val,
                        class: "img-responsive",
                        width: 100,
                        height: 100}).appendTo($div);
    });
    $div.show();
    tirable("#mano img", 1, -1); 
  }
  
  function cambiarArreglo(palo){
    var strPalo = "";
    if (palo === '\u2663') {
      strPalo = palo.replace("\u2663", "treboles");
    } else if (palo === "\u2660") {
      strPalo = palo.replace("\u2660", "picas");
    }else if (palo === "\u2665") {
      strPalo = palo.replace("\u2665", "corazones");
    }else if (palo === "\u2666") {
      strPalo = palo.replace("\u2666", "diamantes");
    }
    
    return strPalo;
  }

  //----------------------------------------------------------------------------
  function continuarCrearJuego() {

    var nombre = $('#nombre_del_juego').val().trim();
    var jugadores = $('#jugadores').val().trim();

    if (nombre === '') {
      mensajeError('El nombre del juego no puede quedar vacío.');
    } else {
      $.ajax({
        url: '/ochoLoco/crear_juego/',
        type: 'POST',
        dataType: 'json',
        data: {
          nombre: nombre,
          jugadores: jugadores
        },
        error: errorConexion,
        success: resultado => {
          var texto;
          if (resultado.creado) {
            $('div').hide();
            $('#mensaje_1').html('Esperando a que alguien más se una al ' +
              'juego <strong>' + escaparHtml(nombre) + '</strong>.');
            $('#boton_mensajes_regresar_al_menu').hide();
            $('#seccion_mensajes').show();
            $('#seccion_tablero').show();
            esperaTurno();
          } else {
            switch (resultado.codigo) {

            case 'duplicado':
              texto = 'Alguien más ya creó un juego con este ' +
                'nombre: <em>' + escaparHtml(nombre) + '</em>';
              break;

            case 'invalido':
              texto = 'No se proporcionó un nombre de juego válido.';
              break;

            default:
              texto = 'Error desconocido.';
              break;
            }
            mensajeError(texto);
          }
        }
      });
    }
    return false; // Se requiere para evitar que la forma haga un "submit".
  }

  //----------------------------------------------------------------------------
  function desactivar(mano) {
      $("#mano .img-responsive ").addClass('desactivo');
  }

  //----------------------------------------------------------------------------
  function errorConexion() {
    mensajeError('No es posible conectarse al servidor.');
  }

  //----------------------------------------------------------------------------
  // Para evitar inyecciones de HTML.
  function escaparHtml (str) {
    return $('<div/>').text(str).html();
  }

  //----------------------------------------------------------------------------
  function esperaTurno() {

    var segundos = 0;

    $('body').css('cursor', 'wait');

    function ticToc() {
      $('#mensaje_3').html('Llevas ' + segundos + ' segundo' +
        (segundos === 1 ? '' : 's') + ' esperando.');
      segundos++;
      $.ajax({
        url: '/ochoLoco/estado/',
        type: 'GET',
        dataType: 'json',
        error: errorConexion,
        success: resultado => {
          switch (resultado.estado) {

          case 'ganaste':
            finDeJuego('<strong>Ganaste.</strong> ¡Felicidades!');
            $("#seccion_tablero").hide();
            $("#seccion_comodin").hide();
            break;

          case 'perdiste':
            finDeJuego('<strong>Perdiste.</strong> ¡Lástima!');
            $("#seccion_tablero").hide();
            $("#seccion_comodin").hide();
            break;
          
          case 'tu_turno':
            turnoTirar(resultado);
            break;

          case 'espera':
            setTimeout(ticToc, PAUSA);
            break;
          }
        }
      });
    };
    setTimeout(ticToc, 0);
  };

  //----------------------------------------------------------------------------
  function finDeJuego(mensaje) {
    $('body').css('cursor', 'auto');
    $('#mensaje_1').html(mensaje);
    $('#mensaje_3').html('');
    $('#boton_mensajes_regresar_al_menu').show();
  }

  //----------------------------------------------------------------------------
  function mensajeError(mensaje) {
    $('body').css('cursor', 'auto');
    $('div').hide();
    $('#mensaje_error').html(mensaje);
    $('#seccion_error').show();
  }

  //----------------------------------------------------------------------------
  function menuPrincipal() {
    reiniciaTablero();
    $('div').hide();
    $('#seccion_menu').show();
    return false;
  }

  //----------------------------------------------------------------------------
  function reiniciaTablero() {
    $("#seccion_tablero img").remove();
  }

  //----------------------------------------------------------------------------
  function tirable(nombre, decision, comodin) {
    $(nombre).click(function () {
      var carta = $("#mano img").index(this);
      var cartaComodin = this;
      if ($(this).attr('src').indexOf("8") >= 0) {
        $("mano").hide();
        $("#descarte").hide();
        $("#boton_tomar_baraja").hide();
        $("#seccion_comodin").show();
        $("#comodin img").click(function (){
          var comodinIndex  = ($("#comodin img").index(this));
          $.ajax({
          url: '/ochoLoco/tirar/',
          type: 'PUT',
          dataType: 'json',
          data: {tiro: carta, decision: decision, comodin: comodinIndex + 1},
          error: errorConexion,
          success: data => {
            if (data.efectuado) {
              $(cartaComodin).remove();
              $("#mano").show();
              $("#boton_tomar_baraja").hide();
              $("#seccion_comodin").hide();
              desactivar(data.jugador);
              $('#mensaje_1').html('Por favor espera tu turno.');
              esperaTurno();
            }
          }
        });
        });
      }else{
        $.ajax({
          url: '/ochoLoco/tirar/',
          type: 'PUT',
          dataType: 'json',
          data: {tiro: carta, decision: decision, comodin: comodin},
          error: errorConexion,
          success: data => {
            if (data.efectuado) {
              $(this).remove();
              $("#mano").show();
              $("#descarte").hide();
              $("#boton_tomar_baraja").hide();
              desactivar(data.jugador);
              $('#mensaje_1').html('Por favor espera tu turno.');
              esperaTurno();
            }
          }
        });
      }
    });
  }
  //--------------------------------------------------------------------------------
  function tomarBaraja(){
      $.ajax({
        url: '/ochoLoco/tirar/',
        type: 'PUT',
        dataType: 'json',
        data: {tiro: -1, decision: 2},
        error: errorConexion,
        success: data => {
          if (data.toma) {
            turnoTirar(data);
          }else{
            $('#mensaje_1').html('Ya no hay cartasen la baraja. Por favor espera tu turno.');
            esperaTurno(data);
          }
        }
      });
    
    
  }
  
  //----------------------------------------------------------------------------
  function turnoTirar(resultado) {
    $("#descarte").show();
    $("#boton_tomar_baraja").show();
    $('body').css('cursor', 'auto');
    $('#mensaje_1').html('Es tu turno.');
    $('#mensaje_3').html('');
    activar(resultado);
  }

});
