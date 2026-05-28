import React from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Something in this panel failed to render.
          </div>
          <p className="mt-1 text-xs text-red-100/75">Refresh the page or try the action again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
