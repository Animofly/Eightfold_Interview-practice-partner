import jsPDF from 'jspdf';

interface Message {
  role: string;
  content: string;
}

export function exportConversationToPDF(
  messages: Message[],
  role: string,
  company: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.text(`Interview: ${role} at ${company}`, margin, yPosition);
  yPosition += 15;

  // Messages
  doc.setFontSize(11);
  messages.forEach((msg) => {
    const roleText = msg.role === 'interviewer' ? 'Interviewer' : 'Candidate';
    
    // Check if we need a new page
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    // Role header
    doc.setFont('helvetica', 'bold');
    doc.text(roleText + ':', margin, yPosition);
    yPosition += 7;

    // Message content
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(msg.content, maxWidth);
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 5;
  });

  doc.save(`interview-${company}-${Date.now()}.pdf`);
}

export function exportResultsToPDF(
  sessionData: { role: string; company: string },
  analysis: any,
  resources?: { title: string; url: string; description: string }[]
) {
  const doc = new jsPDF();
  const margin = 20;
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.text('Interview Results', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.text(`${sessionData.role} at ${sessionData.company}`, margin, yPosition);
  yPosition += 15;

  // Communication Scores
  doc.setFontSize(14);
  doc.text('Communication', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.text(`Clarity: ${analysis.clarity_score}/10`, margin, yPosition);
  yPosition += 7;
  doc.text(`Confidence: ${analysis.confidence_score}/10`, margin, yPosition);
  yPosition += 7;
  doc.text(`Fluency: ${analysis.fluency_description}`, margin, yPosition);
  yPosition += 15;

  // Technical Performance
  doc.setFontSize(14);
  doc.text('Technical Performance', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.text(`Accuracy: ${analysis.technical_accuracy_score}/10`, margin, yPosition);
  yPosition += 7;
  const problemLines = doc.splitTextToSize(analysis.problem_solving_description, 170);
  problemLines.forEach((line: string) => {
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });
  yPosition += 10;

  // Relevance
  doc.setFontSize(14);
  doc.text('Relevance Analysis', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  const relevanceLines = doc.splitTextToSize(analysis.relevance_analysis, 170);
  relevanceLines.forEach((line: string) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });

  // Resources
  if (resources && resources.length > 0) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }
    
    yPosition += 15;
    doc.setFontSize(14);
    doc.text('Preparation Resources', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    resources.forEach((resource) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(resource.title, margin, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.textWithLink(resource.url, margin, yPosition, { url: resource.url });
      yPosition += 5;
      const descLines = doc.splitTextToSize(resource.description, 170);
      descLines.forEach((line: string) => {
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    });
  }

  doc.save(`results-${sessionData.company}-${Date.now()}.pdf`);
}
