package com.tubemerger.app.engine

/**
 * Interface Segregation: IProgressEmitter isolates event-emission from pipeline mechanics.
 */
interface IProgressEmitter {
    fun emit(snapshot: NativeProgressSnapshot)
}
