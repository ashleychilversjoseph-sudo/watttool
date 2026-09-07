package com.chilverselectricalservices.sparkytoolkit;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TorchPlugin.class);
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
