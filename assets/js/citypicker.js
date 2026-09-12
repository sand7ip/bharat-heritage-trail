(function () {
  "use strict";

  var input = document.getElementById("base-city-input");
  var list = document.getElementById("base-city-list");
  var clearBtn = document.getElementById("base-city-clear");
  var activeIndex = -1;
  var currentMatches = [];

  function cityLabel(city) {
    return city.name + ", " + city.state;
  }

  function renderSuggestions(query) {
    var q = query.trim().toLowerCase();
    if (!q) {
      list.hidden = true;
      list.innerHTML = "";
      currentMatches = [];
      return;
    }
    currentMatches = BHT.CITIES.filter(function (c) {
      return c.name.toLowerCase().indexOf(q) === 0;
    });
    if (currentMatches.length === 0) {
      currentMatches = BHT.CITIES.filter(function (c) {
        return c.name.toLowerCase().indexOf(q) !== -1;
      });
    }
    currentMatches = currentMatches.slice(0, 8);
    activeIndex = -1;

    if (currentMatches.length === 0) {
      list.hidden = true;
      list.innerHTML = "";
      return;
    }
    list.innerHTML = currentMatches
      .map(function (c, i) {
        return '<li role="option" id="city-opt-' + i + '" data-index="' + i + '">' + cityLabel(c) + "</li>";
      })
      .join("");
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function selectCity(city) {
    BHT.setBaseCity(city);
    input.value = cityLabel(city);
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    clearBtn.hidden = false;
  }

  function applyStoredCity() {
    var city = BHT.getBaseCity();
    if (city) {
      input.value = cityLabel(city);
      clearBtn.hidden = false;
    } else {
      input.value = "";
      clearBtn.hidden = true;
    }
  }

  input.addEventListener("input", function () {
    renderSuggestions(input.value);
  });

  input.addEventListener("keydown", function (e) {
    if (list.hidden || currentMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
      updateActiveOption();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActiveOption();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) selectCity(currentMatches[activeIndex]);
      else if (currentMatches.length === 1) selectCity(currentMatches[0]);
    } else if (e.key === "Escape") {
      list.hidden = true;
    }
  });

  function updateActiveOption() {
    list.querySelectorAll("li").forEach(function (li, i) {
      li.setAttribute("aria-selected", i === activeIndex ? "true" : "false");
    });
  }

  list.addEventListener("click", function (e) {
    var li = e.target.closest("li");
    if (!li) return;
    var idx = parseInt(li.getAttribute("data-index"), 10);
    selectCity(currentMatches[idx]);
  });

  clearBtn.addEventListener("click", function () {
    BHT.clearBaseCity();
    applyStoredCity();
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest("#base-city-control")) {
      list.hidden = true;
    }
  });

  applyStoredCity();
})();
