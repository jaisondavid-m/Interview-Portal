import React from 'react';
import DynamicPageRoute from './DynamicPageRoute';

export default function AdminRoute({ children }) {
  return <DynamicPageRoute requiredRole="admin">{children}</DynamicPageRoute>;
}

