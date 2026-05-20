export const formatToAMPM = (time24: string) => {
  if (!time24) return "";
  const [hoursStr, minutes] = time24.split(":");
  if (!hoursStr || !minutes) return time24;
  let hours = parseInt(hoursStr);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};
