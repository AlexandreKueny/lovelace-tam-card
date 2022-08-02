import { LitElement, html, customElement, property, TemplateResult, CSSResult, css } from 'lit-element';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';

import { TamCardConfig } from './types';

export class TamCardEditor extends LitElement implements LovelaceCardEditor {
	@property() public hass?: HomeAssistant;
	@property() private _config?: TamCardConfig;
	@property() private _toggle?: boolean;

	public setConfig(config: TamCardConfig): void {
		this._config = config;
		this._config.waitFetch2 = false;
		this.fetchDataApi()
	}

	get _stop(): string {
		if (this._config) {
			return this._config.stop || '';
		}

		return '';
	}

	get _direction(): string {
		if (this._config) {
			return this._config.direction || '';
		}

		return '';
	}

	protected async fetchDataApi() {
		let res = {}
		const tamCSV = await (await fetch("https://montpellier-tam-api-time.vercel.app/api/")).json()

		tamCSV.result.map(o => {
			let tab = []
			var item = tamCSV.result.filter(item => item.stop_name === o.stop_name);
			item.map((j: { trip_headsign: never; }) => tab.push(j.trip_headsign))
			let uniq = [...new Set(tab)]
			res[(o.stop_name).toString()] = uniq
		})
		if (this._config) this._config.allCourses = res
	}

	protected render(): TemplateResult | void {
		if (!this.hass || !this._config || !this._config.allCourses) {
			return html`
				<div class="card-config">
					<div class="description">
						<p>Veuillez patienter le temps de charger les arrêts / directions disponibles.</p>
					</div>
				</div>
			`;
		}

		let allStop = Object.keys(this._config.allCourses);
		allStop.sort();

		let direction
		if (this._config.stop) direction = this._config.allCourses[this._config.stop]

		return html`
			<div class="card-config">
				<div class="description">
					<p>Si votre arrêt / direction n'est pas disponible après le chargement, réessayer ultérieurement de préférence entre lundi et vendredi aux alentour de 12h.</p>
				</div>
				<div class="option">
					<div class="values" for="show_hide_stop">
						<ha-select
							label="Arrêt"
							@selected=${this._valueChanged}
							.configValue=${'stop'}
							.value=${this._stop}
							@closed=${(ev) => ev.stopPropagation()}
						>
							${allStop.map(val => {
								return html` <mwc-list-item .value="${val}">${val}</mwc-list-item> `;
							})}
						</ha-select>
					</div>
					${this._config.stop ?
						html`
							<div class="values" for="show_hide_direction">
								<ha-select
									label="Direction"
									@selected=${this._valueChanged}
									.configValue=${'direction'}
									.value=${this._direction}
									@closed=${(ev) => ev.stopPropagation()}
								>
									${direction.map(val => {
										return html` <mwc-list-item .value="${val}">${val}</mwc-list-item> `;
									})}
								</ha-select>
							</div>
						` :
						html``
					}
					</div>
				</div>
			</div>
		`;
	}

	private _valueChanged(ev): void {
		if (!this._config || !this.hass) {
			return;
		}
		const target = ev.target;
		if (this[`_${target.configValue}`] === target.value) {
			return;
		}
		if (target.configValue == "stop") this._config["direction"] = ""
		if (target.configValue) {
			if (target.value === '') {
				delete this._config[target.configValue];
			} else {
				this._config = {
					...this._config,
					[target.configValue]: target.checked !== undefined ? target.checked : target.value,
				};
			}
		}
		fireEvent(this, 'config-changed', { config: this._config });
	}

	static get styles(): CSSResult {
		return css`
			.card-config {
				width: 95%;
				height: 100%
				margin: auto;
			}
			.option {
				display: flex;
				margin: auto;
				height: 71vh;
			}
			.description {
				padding: 1em;
				margin: auto;
				max-width: 40em;
				font-size: 1em
			}
			ha-select {
				padding: 1em;
			}
			:host {
				--mdc-menu-max-height: 65vh;
			}
		`;
	}
}
customElements.define('tam-card-editor', TamCardEditor);
