var today = new Date()
var dd = String(today.getDate()).padStart(2, '0')
var mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
var yyyy = today.getFullYear()
var hours = today.getHours()
var minutes = today.getMinutes()
today = dd + ' ' + mm + ' ' + yyyy + ' ' + hours + ':' + minutes

export { today }
