// ===================================================================================================
// Student view of study materials from the server.
// ===================================================================================================
import React from 'react';
import { DocumentMaterialHub } from './DocumentMaterialHub';

// Data shape: study materials library props.
interface StudyMaterialsLibraryProps {
  allowUpload?: boolean;
}

// The old sample list here (three made-up notes with a fake download) is gone: materials now come from the server,
// and this screen shows the same library as the Document & Material Hub.
export const StudyMaterialsLibrary: React.FC<StudyMaterialsLibraryProps> = () => <DocumentMaterialHub mode="student" />;
