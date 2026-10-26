import React from 'react';import{createRoot}from'react-dom/client';import{HashRouter}from'react-router-dom';
import {DemoProvider} from './lib/store';import App from './App';import './styles.css';import './courseModel.css';import './assessmentUx192.css';import './reviewCourses.css';import './motion.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><HashRouter><DemoProvider><App/></DemoProvider></HashRouter></React.StrictMode>);
