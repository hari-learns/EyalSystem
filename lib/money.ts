export function formatMoney(value: number) {
  return `Rs. ${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  })}`;
}

export function formatPer100Ml(price: number, ml: number) {
  const amount = price / (ml / 100);
  return `Rs. ${Number(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 1
  })} / 100ml`;
}
