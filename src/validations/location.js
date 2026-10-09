import { City, State } from 'country-state-city';

const COUNTRY = 'IN';

function tidy(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function validateIndianLocation(cityInput, stateInput) {
  const cityName = tidy(cityInput);
  const stateName = tidy(stateInput);
  if (cityName.length < 2 || stateName.length < 2) {
    return { ok: false, error: 'Enter a city and the Indian state it belongs to.' };
  }

  const states = State.getStatesOfCountry(COUNTRY);
  const state = states.find((item) => item.name.toLowerCase() === stateName.toLowerCase() || item.isoCode.toLowerCase() === stateName.toLowerCase());
  if (!state) {
    return { ok: false, error: `"${stateName}" is not a state or union territory of India.` };
  }

  const cities = City.getCitiesOfState(COUNTRY, state.isoCode);
  const matches = cities.filter((item) => item.name.toLowerCase() === cityName.toLowerCase());
  if (matches.length !== 1) {
    return {
      ok: false,
      error: `"${cityName}" is not a listed city in ${state.name}. Check the spelling. The audit was not started.`,
    };
  }

  return { ok: true, city: matches[0].name, state: state.name };
}
