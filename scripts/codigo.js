let boton = document.getElementById('boton1');
let texto = document.getElementById('texto1');
let textoOriginal = texto.innerHTML;

boton.addEventListener('mousedown', function () {
	texto.innerHTML = 'Texto cambiado';
  texto.style.fontSize = '40px';
});

boton.addEventListener('mouseup', function() {
  texto.innerHTML = textoOriginal;
  texto.style.fontSize = '20px';
});


let alto = window.screen.availHeight;
let ancho = window.screen.availWidth;

alert(`alto es: ${alto}, ancho: ${ancho}`)