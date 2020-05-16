const characters = "abcdefghijklmnopqrstuvwxyz";
const numbers = "0123456789";
const charsAndNums = characters + numbers;
const charactersLength = characters.length;
const charsAndNumsLength = charsAndNums.length;

export default function (length: number = 32) {
  let result = "";

  for (let i = 0; i < length; i++) {
    result +=
      i === 0
        ? characters.charAt(Math.floor(Math.random() * charactersLength))
        : charsAndNums.charAt(Math.floor(Math.random() * charsAndNumsLength));
  }

  return result;
}
