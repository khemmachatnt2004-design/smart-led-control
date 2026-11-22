
function turnOn() {
    const status = document.getElementById("status");
    const house = document.querySelector(".house");
    const houseStatus = document.getElementById("houseStatus");

    status.textContent = "ON";
    status.classList.remove("off");
    status.classList.add("on");

    house.classList.add("lights-on");
    houseStatus.textContent = "LIGHTS ARE ON";
}

function turnOff() {
    const status = document.getElementById("status");
    const house = document.querySelector(".house");
    const houseStatus = document.getElementById("houseStatus");

    status.textContent = "OFF";
    status.classList.remove("on");
    status.classList.add("off");

    house.classList.remove("lights-on");
    houseStatus.textContent = "LIGHTS ARE OFF";
}
