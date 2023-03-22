import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ChatComponent } from './components/chat/chat.component';
import { AlertsComponent } from './components/alerts/alerts.component';
import { DisplayComponent } from './components/display/display.component';

@NgModule({
  declarations: [AppComponent, ChatComponent, AlertsComponent, DisplayComponent],
  imports: [BrowserModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
