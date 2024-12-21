// Layout.js

import React from 'react';
import Sidebar from './Sidebar.js';
import Header from './Header.js';
import '../styles/styles.css';

const Layout = ({ children }) => (
  <div className="flex-layout">
    <Sidebar />
    <div className="main-content">
      <Header />
      <div className="content">{children}</div>
    </div>
  </div>
);

export default Layout;
