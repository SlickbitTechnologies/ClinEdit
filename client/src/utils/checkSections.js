/**
 * Utility functions to check and compare template and document sections
 */

export const checkTemplateSections = async () => {
  try {
    const user = window.firebase.auth().currentUser;
    if (!user) {
      console.error('No user is signed in');
      return null;
    }

    const templateRef = window.firebase
      .firestore()
      .collection('users')
      .doc(user.uid)
      .collection('csr_templates')
      .limit(1);

    const snapshot = await templateRef.get();
    
    if (snapshot.empty) {
      console.log('No template found for this user');
      return null;
    }

    const template = snapshot.docs[0].data();
    const sections = template.sections || [];
    
    console.group('Template Sections');
    console.log(`Total sections: ${sections.length}`);
    console.log('Sections structure:', sections);
    
    // Log each section with its subsections
    sections.forEach((section, index) => {
      const subsections = section.subsections || [];
      console.group(`Section ${index + 1}: ${section.title || 'Untitled'}`);
      console.log(`Subsections: ${subsections.length}`);
      subsections.forEach((sub, subIndex) => {
        console.log(`  - ${sub.title || `Subsection ${subIndex + 1}`}`);
      });
      console.groupEnd();
    });
    
    console.groupEnd();
    return sections;
  } catch (error) {
    console.error('Error checking template sections:', error);
    return null;
  }
};

export const checkDocumentSections = async (documentId) => {
  try {
    const user = window.firebase.auth().currentUser;
    if (!user) {
      console.error('No user is signed in');
      return null;
    }

    const docRef = window.firebase
      .firestore()
      .collection('users')
      .doc(user.uid)
      .collection('csr_documents')
      .doc(documentId);

    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.error('Document not found');
      return null;
    }

    const data = doc.data();
    const sections = data.sections || [];
    
    console.group('Document Sections');
    console.log(`Total sections: ${sections.length}`);
    console.log('Sections structure:', sections);
    
    // Log each section with its subsections
    sections.forEach((section, index) => {
      const subsections = section.subsections || [];
      console.group(`Section ${index + 1}: ${section.title || 'Untitled'}`);
      console.log(`Subsections: ${subsections.length}`);
      subsections.forEach((sub, subIndex) => {
        console.log(`  - ${sub.title || `Subsection ${subIndex + 1}`}`);
      });
      console.groupEnd();
    });
    
    console.groupEnd();
    return sections;
  } catch (error) {
    console.error('Error checking document sections:', error);
    return null;
  }
};

export const compareSections = async (documentId) => {
  console.log('=== Comparing Template and Document Sections ===');
  const templateSections = await checkTemplateSections();
  const docSections = await checkDocumentSections(documentId);
  
  if (templateSections && docSections) {
    console.group('Comparison Results');
    console.log(`Template sections: ${templateSections.length}`);
    console.log(`Document sections: ${docSections.length}`);
    
    // Find sections in document that aren't in template
    const docSectionTitles = new Set(docSections.map(s => s.title));
    const templateSectionTitles = new Set(templateSections.map(s => s.title));
    
    const extraSections = [...docSectionTitles].filter(
      title => !templateSectionTitles.has(title)
    );
    
    if (extraSections.length > 0) {
      console.warn('Extra sections in document not found in template:', extraSections);
    } else {
      console.log('All document sections exist in template');
    }
    
    console.groupEnd();
  }
};
