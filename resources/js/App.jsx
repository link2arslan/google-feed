import { createRoot } from 'react-dom/client';
import Main from './Main';
import '../css/app.css';
// import 'bootstrap/dist/css/bootstrap.min.css';

const root = createRoot(document.getElementById('app'));
root.render(<Main />);