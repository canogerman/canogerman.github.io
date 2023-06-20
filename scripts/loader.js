// Remove the loader after the page is fully loaded
window.addEventListener("load", () => {
  const loader = document.querySelector(".loader");
  const loaderText = document.querySelector(".loader-text");
  const loaderBackground = document.querySelector(".loader-background");
  // Just to observe the loader, I keep it for 3 seconds.
  setTimeout(() => {
    loader.style.display = "none";
    loaderText.style.display = "none";
    loaderBackground.style.display = "none";
  }, 3000);
});
