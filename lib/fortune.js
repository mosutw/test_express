var fortunesCookies = [
  "11111",
  "22222",
  "33333",
  "44444",
  "55555",
];

exports.getFortune = function() {
  var idx = Math.floor(Math.random() * fortunesCookies.length);
  return fortunesCookies[idx];
}