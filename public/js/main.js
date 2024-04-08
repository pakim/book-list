window.addEventListener('scroll', function() {
  const header = document.querySelector(".header");

  if (window.scrollY > 0) {
    header.classList.add("scroll");
  } 
  else {
    header.classList.remove("scroll");
  }
});

if(document.querySelector(".book-page")) {
  document.querySelector(".book-page .add-subtitle").addEventListener("click", function() {
    document.querySelector(".book-page #subtitle-label").classList.remove("hidden");
    document.querySelector(".book-page #subtitle").classList.remove("hidden");
    this.classList.add("hidden");
  });

  document.querySelector(".book-page .add-author").addEventListener("click", function() {
    document.querySelector(".book-page #author-label").classList.remove("hidden");
    document.querySelector(".book-page #author").classList.remove("hidden");
    this.classList.add("hidden");
  });

  document.querySelector(".book-page .add-cover").addEventListener("click", function() {
    document.querySelector(".book-page #cover-label").classList.remove("hidden");
    document.querySelector(".book-page #cover").classList.remove("hidden");
    this.classList.add("hidden");
  });

  const rating = document.querySelectorAll(".book-page .rating input");
  rating.forEach(star => {
    star.addEventListener("change", function(event) {
      const value = event.target.value;

      document.querySelectorAll(".book-page .rating label").forEach((label, index) => {
        if(index + 1 <= value) {
          label.classList.add("filled");
        }
        else {
          label.classList.remove("filled");
        }
      });
    });
  });
  if(document.querySelector("form.delete")) {
    document.querySelector("form.submit button.delete").addEventListener("click", () => {
      document.querySelector("form.delete").classList.remove("hidden");
      document.querySelector("form.submit").classList.add("disabled");
      document.querySelector(".header").classList.add("disabled");
      document.querySelector("body").classList.add("no-scroll");
    });

    document.querySelector("form.delete .cancel").addEventListener("click", () => {
      document.querySelector("form.delete").classList.add("hidden");
      document.querySelector("form.submit").classList.remove("disabled");
      document.querySelector(".header").classList.remove("disabled");
      document.querySelector("body").classList.remove("no-scroll");
    });
  }
}