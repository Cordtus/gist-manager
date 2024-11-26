// components/Layout.js

import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { UserProfile } from './UserProfile';

const Layout = ({ children }) => {
  // eslint-disable-next-line no-unused-vars
  const { user } = UserProfile();

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="bg-gray-200 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
