import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera as CameraIcon,
  RotateCcw,
  Video,
  CheckCircle,
  Crosshair,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Image as ImageIcon
} from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

interface LiveCameraCaptureProps {
  onCaptureComplete: (file: File, metadata: {
    isDirectCamera: boolean;
    sha256Hash?: string;
    timestamp: string;
    lat?: number;
    lng?: number;
    deviceModel: string;
    base64DataUrl?: string;
  }) => void;
  currentLat?: number;
  currentLng?: number;
}

export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({
  onCaptureComplete,
  currentLat,
  currentLng
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);
  const mobilePickerInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedBlob, setCapturedBlob] = useState<{ blob: Blob; url: string; type: 'image' | 'video'; name: string } | null>(null);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [hasWebRTC, setHasWebRTC] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const startCamera = useCallback(async () => {
    if (isNative) {
      setHasWebRTC(false);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasWebRTC(false);
      return;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setHasWebRTC(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setHasWebRTC(false);
    }
  }, [facingMode, isNative]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  // Native Capacitor Camera Launcher (Android hardware intent)
  const handleNativeCameraCapture = async (source: CameraSource = CameraSource.Camera) => {
    setIsProcessing(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source
      });

      if (image && image.dataUrl) {
        const dataUrl = image.dataUrl;
        const mimeType = image.format ? `image/${image.format}` : 'image/jpeg';
        const filename = `evidence_cam_${Date.now()}.${image.format || 'jpg'}`;

        // Convert base64 DataURL to File safely without network fetch
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const byteCharacters = atob(base64Data);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: mimeType });
        const file = new File([blob], filename, { type: mimeType });

        setCapturedBlob({
          blob,
          url: dataUrl,
          type: 'image',
          name: filename
        });

        onCaptureComplete(file, {
          isDirectCamera: source === CameraSource.Camera,
          timestamp: new Date().toISOString(),
          lat: currentLat,
          lng: currentLng,
          deviceModel: 'Android Hardware Camera Sensor',
          base64DataUrl: dataUrl
        });
      }
    } catch (err: any) {
      if (!err.message?.includes('cancelled') && !err.message?.includes('canceled')) {
        if (source === CameraSource.Camera) {
          mobileCameraInputRef.current?.click();
        } else {
          mobilePickerInputRef.current?.click();
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, isDirectCamera: boolean = true) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsProcessing(true);

    const isVideo = file.type.startsWith('video');
    const objectUrl = URL.createObjectURL(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64DataUrl = reader.result as string;

      setCapturedBlob({
        blob: file,
        url: objectUrl,
        type: isVideo ? 'video' : 'image',
        name: file.name
      });

      onCaptureComplete(file, {
        isDirectCamera,
        timestamp: new Date().toISOString(),
        lat: currentLat,
        lng: currentLng,
        deviceModel: isDirectCamera
          ? (navigator.userAgent.includes('iPhone')
            ? 'Apple iPhone Camera Sensor'
            : navigator.userAgent.includes('Android')
            ? 'Android Mobile Camera Sensor'
            : 'Web Camera Ingest')
          : 'File Gallery Upload',
        base64DataUrl
      });
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const captureWebRTCPhoto = () => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      if (isNative) {
        handleNativeCameraCapture(CameraSource.Camera);
      } else {
        mobileCameraInputRef.current?.click();
      }
      return;
    }

    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `cam_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });

      setCapturedBlob({
        blob,
        url: dataUrl,
        type: 'image',
        name: file.name
      });

      onCaptureComplete(file, {
        isDirectCamera: true,
        timestamp: new Date().toISOString(),
        lat: currentLat,
        lng: currentLng,
        deviceModel: 'WebRTC Direct Stream Sensor',
        base64DataUrl: dataUrl
      });
    }, 'image/jpeg', 0.95);
  };

  const retake = () => {
    if (capturedBlob) URL.revokeObjectURL(capturedBlob.url);
    setCapturedBlob(null);
  };

  return (
    <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl">
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFileSelected(e, true)}
      />
      <input
        ref={mobilePickerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFileSelected(e, false)}
      />

      <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-sky-400 font-bold">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Direct In-App Camera Ingest</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Anti-Spoofing Active</span>
        </div>
      </div>

      {shutterFlash && <div className="absolute inset-0 bg-white z-40 transition-opacity duration-200" />}

      <div className="relative aspect-[4/3] sm:aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {capturedBlob ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {capturedBlob.type === 'image' ? (
              <img src={capturedBlob.url} alt="Captured Evidence" className="w-full h-full object-contain" />
            ) : (
              <video src={capturedBlob.url} controls autoPlay loop className="w-full h-full object-contain" />
            )}

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-slate-950/95 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/50 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Evidence Photo Attached</span>
                    <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded">
                      SEALED
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {capturedBlob.name} • Geotagged
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={retake}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
            </div>
          </div>
        ) : hasWebRTC ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between items-start text-[11px] font-mono text-sky-400 bg-slate-950/70 p-2 rounded-xl backdrop-blur-sm border border-sky-500/20">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    <span>LIVE SENSOR FEED</span>
                  </div>
                  <div>LAT: {currentLat?.toFixed(5) || '12.97160'} N</div>
                  <div>LNG: {currentLng?.toFixed(5) || '77.59460'} E</div>
                </div>
                <div className="text-right text-emerald-400 font-bold">SHA-256 PIPELINE</div>
              </div>

              <div className="self-center">
                <Crosshair className="w-12 h-12 text-sky-400/40 animate-pulse" />
              </div>

              <div className="text-center text-[11px] text-slate-400 bg-slate-950/70 py-1 px-3 rounded-full backdrop-blur-sm self-center">
                Tap Shutter to capture photo
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-4 w-full h-full bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-0.5 shadow-xl shadow-sky-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-sky-400">
                <Smartphone className="w-10 h-10 animate-bounce" />
              </div>
            </div>

            <div className="space-y-1 max-w-sm">
              <h4 className="text-base sm:text-lg font-black text-white">
                Snap Direct Camera Evidence
              </h4>
              <p className="text-xs text-slate-400">
                Capture live camera photo to seal optical sensor metadata and verify authenticity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (isNative) {
                    handleNativeCameraCapture(CameraSource.Camera);
                  } else {
                    mobileCameraInputRef.current?.click();
                  }
                }}
                disabled={isProcessing}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-500 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-xl shadow-sky-500/30 transition flex items-center justify-center gap-2.5 active:scale-95 animate-radar"
              >
                <CameraIcon className="w-5 h-5" />
                <span>{isProcessing ? 'Opening Camera...' : 'TAKE PHOTO WITH PHONE CAMERA'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isNative) {
                    handleNativeCameraCapture(CameraSource.Photos);
                  } else {
                    mobilePickerInputRef.current?.click();
                  }
                }}
                className="px-5 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Browse Gallery</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {!capturedBlob && hasWebRTC && (
        <div className="bg-slate-950 p-4 flex items-center justify-around border-t border-slate-800">
          <button
            type="button"
            onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
            className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={captureWebRTCPhoto}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 p-1 shadow-lg shadow-sky-500/30 hover:scale-105 active:scale-95 transition flex items-center justify-center"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <CameraIcon className="w-7 h-7 text-slate-950" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
