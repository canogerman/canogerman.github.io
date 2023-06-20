const time = document.getElementById("time");
const date = document.getElementById("date");

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const interval = setInterval(() => {
  const local = new Date();

  let day = local.getDate(),
    month = local.getMonth(),
    year = local.getFullYear();

  time.innerHTML = local.toLocaleTimeString();
  date.innerHTML = `${day} ${monthNames[month]} ${year}`;
}, 1000);
