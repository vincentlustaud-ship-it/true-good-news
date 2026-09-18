/** npm run hash-password -- 'mot de passe'  →  valeur pour ADMIN_PASSWORD_HASH */
import bcrypt from "bcryptjs";
const pw = process.argv[2];
if (!pw || pw.length < 12) { console.error("Donnez un mot de passe d'au moins 12 caractères."); process.exit(2); }
console.log(bcrypt.hashSync(pw, 12));
