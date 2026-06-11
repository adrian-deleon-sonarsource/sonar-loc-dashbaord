package com.locdashboard;

import org.sonar.api.Plugin;

public class LocDashboardPlugin implements Plugin {
    @Override
    public void define(Context context) {
        context.addExtension(DashboardPageDefinition.class);
    }
}
