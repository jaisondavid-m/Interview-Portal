import React from 'react';
import DynamicPageRoute from './DynamicPageRoute';

export default function DeveloperRoute({ children }) {
  return <DynamicPageRoute pageKey="audit_logs">{children}</DynamicPageRoute>;
}

