// Site configuration. Edit this file to change the games, the form or the sheet.
const CONFIG = {
    form: {
        url: 'https://docs.google.com/forms/d/e/1FAIpQLSdVyl_d3h3iOuGAw1OWeFuGs3sCxSYsgJvCx-1sTYyD0ngt-A/viewform',
        // Prefill parameters. Find them with the form editor's "Get pre-filled link".
        nameField: 'entry.341592953',
        gameField: 'entry.118514155',
    },

    sheet: {
        // The responses sheet must be shared as "Anyone with the link: Viewer".
        csvUrl: 'https://docs.google.com/spreadsheets/d/1qtlSQjPxCrss7NFNDrx7U9_1d5nyQznV3akdywA70dM/export?format=csv',
        // Columns are found by their header text, so their order does not matter.
        columns: {
            name: 'Oma nimi',
            game: 'Peli',
            score: 'Pisteet',
            // Optional column added by hand. A row with any text in it is not shown.
            rejected: 'Hylätty',
        },
    },

    refreshIntervalMs: 30_000,
    topCount: 5,

    games: [
        {
            // Must be exactly the same as the option text of the "Peli" question in the form.
            formOption: 'Peli 1',
            title: 'Peli 1',
            image: null, // e.g. 'assets/games/game-1.webp'
            mode: '[pelimuoto]',
            level: '[taso]',
            description: '[Lyhyt kuvaus siitä, mitä pelissä tehdään ja miten pisteet lasketaan.]',
        },
        {
            formOption: 'Peli 2',
            title: 'Peli 2',
            image: null,
            mode: '[pelimuoto]',
            level: '[taso]',
            description: '[Lyhyt kuvaus siitä, mitä pelissä tehdään ja miten pisteet lasketaan.]',
        },
        {
            formOption: 'Peli 3',
            title: 'Peli 3',
            image: null,
            mode: '[pelimuoto]',
            level: '[taso]',
            description: '[Lyhyt kuvaus siitä, mitä pelissä tehdään ja miten pisteet lasketaan.]',
        },
        {
            formOption: 'Peli 4',
            title: 'Peli 4',
            image: null,
            mode: '[pelimuoto]',
            level: '[taso]',
            description: '[Lyhyt kuvaus siitä, mitä pelissä tehdään ja miten pisteet lasketaan.]',
        },
    ],
};
