
require("dotenv").config();

const app = require("./src/app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`HOPE ERP backend is running on port ${PORT}`);
});
