// ===================================================================================================
// Wrapper that shows the placement portal inside the dashboards.
// ===================================================================================================
import React from 'react';
import { ComprehensivePlacementPortal } from '../placement/ComprehensivePlacementPortal';

// Data shape: internship placement portal props.
interface InternshipPlacementPortalProps {
  allowPost?: boolean;
}

// Screen part: internship placement portal.
export const InternshipPlacementPortal: React.FC<InternshipPlacementPortalProps> = () => {
  return <ComprehensivePlacementPortal />;
};
