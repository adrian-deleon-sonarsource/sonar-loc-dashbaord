package com.locdashboard;

import org.sonar.api.web.page.Context;
import org.sonar.api.web.page.Page;
import org.sonar.api.web.page.PageDefinition;

public class DashboardPageDefinition implements PageDefinition {
    @Override
    public void define(Context context) {
        context.addPage(
            Page.builder("locdashboard/index")
                .setName("LOC Dashboard")
                .setScope(Page.Scope.GLOBAL)
                .build()
        );
    }
}
