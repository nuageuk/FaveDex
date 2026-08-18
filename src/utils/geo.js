export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  const response = await fetch(url)
  const data = await response.json()
  const address = data.address || {}
  const city = address.city || address.town || address.village || null
  const country = address.country_code ? address.country_code.toUpperCase() : null
  return { city, country }
}
