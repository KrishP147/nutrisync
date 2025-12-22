import { Component } from 'react';
import { AlertCircle } from 'lucide-react';

class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-white/40">
          <AlertCircle size={32} className="mb-2 opacity-50" />
          <p>Chart failed to load</p>
          <p className="text-xs mt-1">Try refreshing the page</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;

