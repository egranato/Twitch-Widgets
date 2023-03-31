import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ChatComponent } from './components/chat/chat.component';
import { AlertsComponent } from './components/alerts/alerts.component';
import { DisplayComponent } from './components/display/display.component';
import { AuthComponent } from './components/auth/auth.component';
import { PointRedemptionsComponent } from './components/point-redemptions/point-redemptions.component';
import { RewardMediaComponent } from './components/point-redemptions/reward-media/reward-media.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatComponent,
    AlertsComponent,
    DisplayComponent,
    AuthComponent,
    PointRedemptionsComponent,
    RewardMediaComponent,
  ],
  imports: [BrowserModule, AppRoutingModule, HttpClientModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
