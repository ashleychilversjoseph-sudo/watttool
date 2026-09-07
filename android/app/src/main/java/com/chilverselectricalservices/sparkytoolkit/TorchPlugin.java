package com.chilverselectricalservices.sparkytoolkit;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "Torch",
    permissions = { @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }) }
)
public class TorchPlugin extends Plugin {
    private String torchCameraId;

    private String findTorchCamera() throws CameraAccessException {
        if (torchCameraId != null) return torchCameraId;
        CameraManager manager = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
        for (String id : manager.getCameraIdList()) {
            Boolean flash = manager.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
            if (Boolean.TRUE.equals(flash)) {
                torchCameraId = id;
                return id;
            }
        }
        return null;
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("available", findTorchCamera() != null);
            call.resolve(result);
        } catch (CameraAccessException error) {
            call.reject("Could not check torch availability", error);
        }
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        if (getPermissionState("camera") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermissionCallback");
            return;
        }
        try {
            String id = findTorchCamera();
            if (id == null) {
                call.reject("No torch is available");
                return;
            }
            boolean enabled = call.getBoolean("enabled", false);
            CameraManager manager = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
            manager.setTorchMode(id, enabled);
            JSObject result = new JSObject();
            result.put("enabled", enabled);
            call.resolve(result);
        } catch (CameraAccessException | SecurityException error) {
            call.reject("Could not change torch state", error);
        }
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        if (getPermissionState("camera") == com.getcapacitor.PermissionState.GRANTED) {
            setEnabled(call);
        } else {
            call.reject("Camera permission is required for the torch");
        }
    }
}
