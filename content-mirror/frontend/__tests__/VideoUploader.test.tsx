import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";
import { VideoUploader } from "@/components/analysis/VideoUploader";

const noop = () => {};

describe("VideoUploader", () => {
  describe("idle state", () => {
    it("renders the drop zone with descriptive text", () => {
      render(<VideoUploader onUpload={noop} onAnalyzeUrl={noop} isUploading={false} progress={0} />);
      expect(screen.getByText(/drop your video here/i)).toBeInTheDocument();
      expect(screen.getByText(/mp4.*mov.*avi.*mkv/i)).toBeInTheDocument();
    });

    it("renders the Browse files button", () => {
      render(<VideoUploader onUpload={noop} onAnalyzeUrl={noop} isUploading={false} progress={0} />);
      expect(screen.getByRole("button", { name: /browse files/i })).toBeInTheDocument();
    });

    it("renders the URL input field", () => {
      render(<VideoUploader onUpload={noop} onAnalyzeUrl={noop} isUploading={false} progress={0} />);
      expect(screen.getByPlaceholderText(/tiktok/i)).toBeInTheDocument();
    });

    it("Analyze URL button is disabled when input is empty", () => {
      render(<VideoUploader onUpload={noop} onAnalyzeUrl={noop} isUploading={false} progress={0} />);
      const btn = screen.getByRole("button", { name: /analyze url/i });
      expect(btn).toBeDisabled();
    });

    it("updates URL input value as user types", async () => {
      render(<VideoUploader onUpload={noop} onAnalyzeUrl={noop} isUploading={false} progress={0} />);
      const input = screen.getByPlaceholderText(/tiktok/i);
      await userEvent.type(input, "https://example.com/video");
      expect(input).toHaveValue("https://example.com/video");
    });
  });

  describe("uploading state", () => {
    it("shows a spinner instead of the drop zone", () => {
      render(<VideoUploader onUpload={noop} onAnalyzeUrl={noop} isUploading progress={40} stage="analyzing_audio" />);
      expect(screen.queryByText(/drop your video here/i)).not.toBeInTheDocument();
    });

    it("displays the correct stage label", () => {
      render(<VideoUploader onUpload={noop} onAnalyzeUrl={noop} isUploading progress={55} stage="analyzing_audio" />);
      expect(screen.getByText("Analyzing audio…")).toBeInTheDocument();
    });

    it("shows fallback label for unknown stage", () => {
      render(<VideoUploader onUpload={noop} onAnalyzeUrl={noop} isUploading progress={20} />);
      expect(screen.getByText("Analyzing your content…")).toBeInTheDocument();
    });

    it("shows correct progress percentage", () => {
      render(<VideoUploader onUpload={noop} onAnalyzeUrl={noop} isUploading progress={73} stage="generating_insights" />);
      expect(screen.getByText("73% complete")).toBeInTheDocument();
    });

    it("shows each stage label correctly", () => {
      const stages: Array<[string, string]> = [
        ["uploading", "Uploading…"],
        ["preprocessing", "Preprocessing frames…"],
        ["analyzing_video", "Analyzing video structure…"],
        ["analyzing_audio", "Analyzing audio…"],
        ["analyzing_visual", "Analyzing visuals…"],
        ["generating_insights", "Generating insights…"],
      ];

      for (const [stage, label] of stages) {
        const { unmount } = render(
          <VideoUploader onUpload={noop} onAnalyzeUrl={noop} isUploading progress={50} stage={stage as never} />
        );
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      }
    });
  });
});
